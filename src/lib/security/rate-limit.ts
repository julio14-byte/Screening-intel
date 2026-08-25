/**
 * Rate limiting — memoria (dev / single instance) + Upstash Redis REST (prod).
 *
 * Variables opcionales:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

export type RateLimitConfig = {
  /** Ventana en segundos */
  windowSec: number;
  /** Máximo de requests por ventana */
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type MemoryEntry = { count: number; resetAt: number };

const memoryStore = new Map<string, MemoryEntry>();

function memoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowSec * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.max - 1, resetAt };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  };
}

async function upstashRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const windowKey = `${redisKey}:${Math.floor(nowSec / config.windowSec)}`;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["EXPIRE", windowKey, config.windowSec.toString()],
      ]),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { result?: unknown[] };
    const count = Number(data.result?.[0] ?? 1);
    const resetAt = (Math.floor(nowSec / config.windowSec) + 1) * config.windowSec * 1000;

    return {
      allowed: count <= config.max,
      remaining: Math.max(0, config.max - count),
      resetAt,
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstash = await upstashRateLimit(key, config);
  if (upstash) return upstash;
  return memoryRateLimit(key, config);
}

/** Prefijos de rate limit por ruta crítica. */
export const RATE_LIMITS = {
  authLogin: { windowSec: 900, max: 10 },
  patientImport: { windowSec: 3600, max: 20 },
  waitlist: { windowSec: 3600, max: 5 },
  rbacWrite: { windowSec: 3600, max: 30 },
  auditWrite: { windowSec: 3600, max: 60 },
} as const satisfies Record<string, RateLimitConfig>;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitKey(route: string, ip: string, userId?: string): string {
  return userId ? `${route}:u:${userId}` : `${route}:ip:${ip}`;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}

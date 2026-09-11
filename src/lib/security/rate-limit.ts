/**
 * Rate limiting en memoria (middleware / instancia local).
 * En despliegues multi-instancia cada réplica cuenta por separado.
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

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
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

import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

type MemoryEntry = { count: number; resetAt: number };

const memory = new Map<string, MemoryEntry>();
const MEMORY_MAX_KEYS = 5000;
let dbDisabledUntil = 0;

function memoryHit(key: string, max: number, windowSec: number): RateLimitResult {
  const now = Date.now();

  if (memory.size > MEMORY_MAX_KEYS) {
    for (const [k, entry] of memory) {
      if (now >= entry.resetAt) memory.delete(k);
    }
    if (memory.size > MEMORY_MAX_KEYS) memory.clear();
  }

  const entry = memory.get(key);
  if (!entry || now >= entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Límite de peticiones por clave. Usa Postgres (rate_limit_hit) para compartir
 * el contador entre instancias serverless; si la función no existe o falla, cae
 * a memoria por instancia (mejor que nada, pero no compartido).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && Date.now() >= dbDisabledUntil) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("rate_limit_hit", {
        p_key: key,
        p_max: max,
        p_window_seconds: windowSec,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row.allowed === "boolean") {
        return {
          allowed: row.allowed,
          retryAfterSec: Number(row.retry_after) || 0,
        };
      }
    } catch {
      dbDisabledUntil = Date.now() + 60_000;
    }
  }
  return memoryHit(key, max, windowSec);
}

/** IP del cliente; en Vercel `x-vercel-forwarded-for` no es falsificable. */
export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export function tooManyRequests(
  result: RateLimitResult,
  message = "Demasiados intentos. Espera un momento e inténtalo de nuevo."
) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, result.retryAfterSec)),
    },
  });
}

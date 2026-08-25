import { NextResponse } from "next/server";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
  rateLimitKey,
  RATE_LIMITS,
  type RateLimitConfig,
} from "./rate-limit";

export type RateLimitRoute = keyof typeof RATE_LIMITS;

/** Resuelve la ruta de rate limit según pathname + método HTTP. */
export function resolveRateLimitRoute(
  pathname: string,
  method: string
): RateLimitRoute | null {
  if (pathname === "/api/auth/login" && method === "POST") {
    return "authLogin";
  }
  if (pathname === "/api/patients/import" && method === "POST") {
    return "patientImport";
  }
  if (pathname === "/api/waitlist" && method === "POST") {
    return "waitlist";
  }
  if (pathname.startsWith("/api/rbac") && method !== "GET") {
    return "rbacWrite";
  }
  if (pathname === "/api/audit" && method === "POST") {
    return "auditWrite";
  }
  return null;
}

/**
 * Aplica rate limiting. Devuelve 429 si se excede el límite; null si continúa.
 * Opcionalmente adjunta cabeceras X-RateLimit-* a la respuesta exitosa.
 */
export async function enforceRateLimit(
  request: Request,
  route: RateLimitRoute,
  userId?: string
): Promise<NextResponse | null> {
  const config: RateLimitConfig = RATE_LIMITS[route];
  const ip = clientIp(request);
  const key = rateLimitKey(route, ip, userId);
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intentá de nuevo más tarde." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(result),
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return null;
}

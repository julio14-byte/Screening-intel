import { NextResponse, type NextRequest } from "next/server";
import { isDemoEmail } from "@/lib/auth/constants";
import { isClinicalLead, type AppRole } from "@/lib/rbac/types";

export const IDLE_AT_COOKIE = "si-idle-at";
export const AUTH_AT_COOKIE = "si-auth-at";

const DEFAULT_IDLE_MINUTES = 30;
const DEFAULT_SESSION_HOURS = 8;

function parseEnvNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envFlag(name: string): boolean | null {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return null;
}

/** Login demo solo en desarrollo, salvo `ALLOW_DEMO_LOGIN=true`. */
export function isDemoLoginEnabled(): boolean {
  const flag = envFlag("ALLOW_DEMO_LOGIN");
  if (flag !== null) return flag;
  return process.env.NODE_ENV !== "production";
}

/**
 * MFA obligatorio para PI / sub-PI en producción.
 * `REQUIRE_MFA=false` lo desactiva (p. ej. hasta habilitar TOTP en el dashboard).
 */
export function isMfaEnforced(): boolean {
  const flag = envFlag("REQUIRE_MFA");
  if (flag !== null) return flag;
  return process.env.NODE_ENV === "production";
}

export function roleRequiresMfa(role: AppRole | null | undefined): boolean {
  if (!role) return false;
  return isClinicalLead(role);
}

export function shouldSkipMfaForUser(
  email: string | null | undefined,
  role: AppRole | null | undefined
): boolean {
  if (!isMfaEnforced()) return true;
  if (!roleRequiresMfa(role)) return true;
  if (isDemoLoginEnabled() && isDemoEmail(email)) return true;
  return false;
}

/** 0 desactiva el límite de inactividad. */
export function getIdleTimeoutMs(): number {
  const minutes = parseEnvNumber(
    process.env.AUTH_IDLE_MINUTES,
    DEFAULT_IDLE_MINUTES
  );
  if (minutes <= 0) return 0;
  return minutes * 60 * 1000;
}

/** 0 desactiva el límite absoluto. */
export function getAbsoluteTimeoutMs(): number {
  const hours = parseEnvNumber(
    process.env.AUTH_SESSION_HOURS,
    DEFAULT_SESSION_HOURS
  );
  if (hours <= 0) return 0;
  return hours * 60 * 60 * 1000;
}

export function parseEpochCookie(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export type SessionExpiryReason = "idle" | "absolute";

export function getSessionExpiryReason(
  now: number,
  idleAt: number | null,
  authAt: number | null
): SessionExpiryReason | null {
  const absMs = getAbsoluteTimeoutMs();
  if (absMs > 0 && authAt !== null && now - authAt > absMs) {
    return "absolute";
  }
  const idleMs = getIdleTimeoutMs();
  if (idleMs > 0 && idleAt !== null && now - idleAt > idleMs) {
    return "idle";
  }
  return null;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

export function clearSessionActivityCookies(response: NextResponse) {
  const expired = cookieOptions(0);
  response.cookies.set(IDLE_AT_COOKIE, "", expired);
  response.cookies.set(AUTH_AT_COOKIE, "", expired);
}

export function applySessionActivityCookies(
  response: NextResponse,
  request: NextRequest,
  now = Date.now(),
  options?: { resetAbsolute?: boolean }
) {
  const idleMs = getIdleTimeoutMs();
  const absMs = getAbsoluteTimeoutMs();

  if (idleMs > 0) {
    response.cookies.set(
      IDLE_AT_COOKIE,
      String(now),
      cookieOptions(Math.ceil(idleMs / 1000) + 120)
    );
  }

  if (absMs > 0) {
    const existing = options?.resetAbsolute
      ? null
      : parseEpochCookie(request.cookies.get(AUTH_AT_COOKIE)?.value);
    const authAt = existing ?? now;
    response.cookies.set(
      AUTH_AT_COOKIE,
      String(authAt),
      cookieOptions(Math.ceil(absMs / 1000) + 120)
    );
  }
}

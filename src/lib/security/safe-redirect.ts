/** Solo rutas internas: evita open redirect con `//host`, `/\host` o esquemas. */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  return value;
}

type CookieOptions = {
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  [key: string]: unknown;
};

/** Cookies de sesión: Secure en producción y SameSite nunca "none". */
export function hardenAuthCookieOptions<T extends CookieOptions | undefined>(
  options: T
): T {
  const base = (options ?? {}) as CookieOptions;
  return {
    ...base,
    secure: process.env.NODE_ENV === "production" ? true : base.secure,
    sameSite: base.sameSite === "strict" ? "strict" : "lax",
  } as T;
}

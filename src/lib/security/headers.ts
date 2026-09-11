/**
 * Content Security Policy y cabeceras HTTP para HealthTech / HIPAA-ready baseline.
 * Ajustá connect-src si agregás dominios externos (analytics, etc.).
 */
const isProd = process.env.NODE_ENV === "production";

const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : "https://*.supabase.co";
  } catch {
    return "https://*.supabase.co";
  }
})();

/** CSP estricta; Next.js requiere unsafe-inline en styles. Scripts sin unsafe-eval en prod. */
export function buildContentSecurityPolicy(): string {
  const scriptSrc = isProd
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseHost} wss://*.supabase.co https://api.stripe.com https://*.stripe.com`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": buildContentSecurityPolicy(),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(self)",
  ...(isProd
    ? {
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
      }
    : {}),
};

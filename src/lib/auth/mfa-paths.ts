import { isPublicApiPath, routes } from "@/lib/app/routes";

/** Rutas permitidas con sesión AAL1 mientras se completa MFA. */
export function isMfaExemptPath(pathname: string): boolean {
  if (pathname === routes.login || pathname === routes.loginMfa) return true;
  if (
    pathname === routes.app.security ||
    pathname.startsWith(`${routes.app.security}/`)
  ) {
    return true;
  }
  if (
    pathname === routes.apis.authLogout ||
    pathname === routes.apis.authSession
  ) {
    return true;
  }
  return isPublicApiPath(pathname);
}

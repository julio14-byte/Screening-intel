import config from "@/config";

/** Rutas canónicas — middleware, nav y landing leen desde aquí. */
export const routes = config.routes;

export function isProtectedPath(pathname: string): boolean {
  return routes.protected.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isPublicApiPath(pathname: string): boolean {
  return routes.publicApis.some((p) => pathname.startsWith(p));
}

/** Páginas del sujeto (sin login de staff). No usar startsWith("/candidato") — choca con /candidatos. */
export function isPublicPatientPath(pathname: string): boolean {
  const prefixes = [routes.eproApp, routes.diario];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function loginUrlWithFrom(path: string): string {
  return `${routes.login}?from=${encodeURIComponent(path)}`;
}

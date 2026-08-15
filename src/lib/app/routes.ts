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

export function loginUrlWithFrom(path: string): string {
  return `${routes.login}?from=${encodeURIComponent(path)}`;
}

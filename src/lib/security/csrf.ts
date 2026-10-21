const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  if (forwarded) hosts.add(forwarded.split(",")[0].trim().toLowerCase());
  if (host) hosts.add(host.toLowerCase());
  const configured = hostOf(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) hosts.add(configured);
  return hosts;
}

/**
 * Defensa CSRF para peticiones que cambian estado. Los navegadores envían
 * `Sec-Fetch-Site` y `Origin` en POST/PUT/PATCH/DELETE; si indican otro sitio,
 * se rechaza aunque la cookie de sesión viaje. Clientes sin ambas cabeceras
 * (curl, servidores) no pueden ser víctimas de CSRF de navegador.
 */
export function isSameOriginMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "none";

  const origin = request.headers.get("origin");
  if (origin) {
    const originHost = hostOf(origin);
    return originHost !== null && allowedHosts(request).has(originHost);
  }
  return true;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/config";
import { isMfaExemptPath } from "@/lib/auth/mfa-paths";
import {
  applySessionActivityCookies,
  AUTH_AT_COOKIE,
  clearSessionActivityCookies,
  getSessionExpiryReason,
  IDLE_AT_COOKIE,
  parseEpochCookie,
  shouldSkipMfaForUser,
} from "@/lib/auth/session-policy";
import { routes } from "@/lib/app/routes";
import { isProtectedPath, isPublicApiPath } from "@/lib/app/routes";
import {
  isRouteAllowedForRole,
  isWriteApiPath,
} from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/types";
import { isSameOriginMutation } from "@/lib/security/csrf";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { securityEvent } from "@/lib/security/log";
import {
  hardenAuthCookieOptions,
  safeRedirectPath,
} from "@/lib/security/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPaywallRedirect } from "@/plugins/stripe/paywall";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

async function fetchUserClinicalRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<AppRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as AppRole | undefined) ?? "coordinator";
}

function isPublicMarketingPath(pathname: string) {
  return (
    pathname === config.auth.landingUrl ||
    pathname === routes.app.docs ||
    pathname.startsWith("/docs/")
  );
}

function applyBufferedCookies(
  target: NextResponse,
  cookiesToSet: CookieToSet[]
) {
  cookiesToSet.forEach(({ name, value, options }) =>
    target.cookies.set(name, value, options)
  );
}

export async function updateSession(request: NextRequest) {
  try {
    return await runUpdateSession(request);
  } catch (err) {
    console.error("[middleware] updateSession failed:", (err as Error)?.message);
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/api/") && !isPublicApiPath(pathname)) {
      return NextResponse.json(
        { error: "Servicio no disponible. Inténtalo de nuevo." },
        { status: 503 }
      );
    }
    if (isProtectedPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = config.auth.loginUrl;
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }
}

async function runUpdateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sessionCookies: CookieToSet[] = [];
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    !isSameOriginMutation(request)
  ) {
    securityEvent("csrf_blocked", {
      path: pathname,
      method: request.method,
      ip: clientIp(request),
    });
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const isLogin = pathname === config.auth.loginUrl;
  const isMfaChallenge = pathname === routes.loginMfa;
  const isPublic =
    isPublicMarketingPath(pathname) ||
    pathname === routes.privacy ||
    isLogin ||
    isMfaChallenge ||
    isPublicApiPath(pathname);

  if (!isSupabaseConfigured()) {
    if (!isPublic && !isLogin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = config.auth.loginUrl;
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            sessionCookies.push({
              name,
              value,
              options: hardenAuthCookieOptions(options),
            });
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenAuthCookieOptions(options))
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  function finish(res: NextResponse, options?: { resetAbsolute?: boolean }) {
    applyBufferedCookies(res, sessionCookies);
    if (user) {
      applySessionActivityCookies(res, request, Date.now(), options);
    }
    res.headers.set("x-pathname", pathname);
    if (isProtectedPath(pathname)) {
      res.headers.set("Cache-Control", "private, no-store, max-age=0");
    }
    return res;
  }

  if (user) {
    const now = Date.now();
    const expired = getSessionExpiryReason(
      now,
      parseEpochCookie(request.cookies.get(IDLE_AT_COOKIE)?.value),
      parseEpochCookie(request.cookies.get(AUTH_AT_COOKIE)?.value)
    );

    if (expired) {
      await supabase.auth.signOut();
      if (pathname.startsWith("/api/")) {
        const json = NextResponse.json(
          { error: "Sesión expirada. Volvé a iniciar sesión." },
          { status: 401 }
        );
        applyBufferedCookies(json, sessionCookies);
        clearSessionActivityCookies(json);
        return json;
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = config.auth.loginUrl;
      loginUrl.search = "";
      loginUrl.searchParams.set("reason", "timeout");
      const redirect = NextResponse.redirect(loginUrl);
      applyBufferedCookies(redirect, sessionCookies);
      clearSessionActivityCookies(redirect);
      return redirect;
    }
  }

  response.headers.set("x-pathname", pathname);

  let role: AppRole | null = null;

  if (user) {
    role = await fetchUserClinicalRole(supabase, user.id);
    const skipMfa = shouldSkipMfaForUser(user.email, role);

    if (!skipMfa) {
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error("[middleware] MFA AAL:", aalError.message);
      } else if (aal) {
        const hasAal2 = aal.currentLevel === "aal2";
        const enrolled = aal.nextLevel === "aal2";

        if (hasAal2 && isMfaChallenge) {
          const url = request.nextUrl.clone();
          url.pathname = config.auth.afterLoginUrl;
          url.search = "";
          return finish(NextResponse.redirect(url));
        }

        if (!hasAal2 && !isMfaExemptPath(pathname)) {
          if (pathname.startsWith("/api/")) {
            return finish(
              NextResponse.json(
                {
                  error: enrolled
                    ? "Se requiere el código MFA de tu autenticador."
                    : "Debés activar MFA (TOTP) para continuar.",
                },
                { status: 403 }
              )
            );
          }

          const url = request.nextUrl.clone();
          if (enrolled) {
            url.pathname = routes.loginMfa;
            url.search = "";
          } else {
            url.pathname = routes.app.security;
            url.search = "enroll=1";
          }
          return finish(NextResponse.redirect(url));
        }

        if (!hasAal2 && isMfaChallenge && !enrolled) {
          const url = request.nextUrl.clone();
          url.pathname = routes.app.security;
          url.search = "enroll=1";
          return finish(NextResponse.redirect(url));
        }
      }
    } else if (isMfaChallenge) {
      const url = request.nextUrl.clone();
      url.pathname = config.auth.afterLoginUrl;
      url.search = "";
      return finish(NextResponse.redirect(url));
    }
  } else if (isMfaChallenge) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = config.auth.loginUrl;
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    const from = request.nextUrl.searchParams.get("from");
    const next = request.nextUrl.searchParams.get("next");
    const redirectPath = safeRedirectPath(
      from ?? next,
      config.auth.afterLoginUrl
    );
    const target = new URL(redirectPath, request.nextUrl.origin);
    url.pathname = target.pathname;
    url.search = target.search;
    return finish(NextResponse.redirect(url));
  }

  if (user && isPublicMarketingPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = config.auth.afterLoginUrl;
    return finish(NextResponse.redirect(url));
  }

  if (!user && pathname.startsWith("/api/") && !isPublicApiPath(pathname)) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = config.auth.loginUrl;
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedPath(pathname) && !pathname.startsWith("/account")) {
    const paywallRedirect = await getPaywallRedirect(user.id, pathname);
    if (paywallRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = paywallRedirect.split("?")[0];
      const qs = paywallRedirect.split("?")[1];
      if (qs) {
        new URLSearchParams(qs).forEach((v, k) => url.searchParams.set(k, v));
      }
      return finish(NextResponse.redirect(url));
    }
  }

  if (user && role) {
    if (!isRouteAllowedForRole(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = routes.app.dashboard;
      url.searchParams.set("rbac", "denied");
      return finish(NextResponse.redirect(url));
    }

    const isWriteMethod = !["GET", "HEAD", "OPTIONS"].includes(request.method);

    if (isWriteMethod && pathname.startsWith("/api/") && user) {
      const limited = await rateLimit(`write:${user.id}`, 240, 60);
      if (!limited.allowed) {
        securityEvent("write_rate_limited", { path: pathname, user: user.id });
        return tooManyRequests(limited);
      }
    }
    const isWriteApi = isWriteApiPath(pathname);

    if (isWriteMethod && isWriteApi && role === "monitor") {
      return NextResponse.json(
        { error: "Monitor CRA: acceso de solo lectura." },
        { status: 403 }
      );
    }
  }

  return finish(response);
}

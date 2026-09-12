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
  WRITE_API_PREFIXES,
} from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/types";
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
    return NextResponse.next({ request });
  }
}

async function runUpdateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sessionCookies: CookieToSet[] = [];
  const { pathname } = request.nextUrl;

  const isLogin = pathname === config.auth.loginUrl;
  const isMfaChallenge = pathname === routes.loginMfa;
  const isPublic =
    isPublicMarketingPath(pathname) ||
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
            sessionCookies.push({ name, value, options });
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
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
          { error: "Sesión expirada. Vuelve a iniciar sesión." },
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
                    : "Debes activar MFA (TOTP) para continuar.",
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
    const redirectPath =
      (from && from.startsWith("/") && !from.startsWith("//") ? from : null) ??
      (next && next.startsWith("/") && !next.startsWith("//") ? next : null) ??
      config.auth.afterLoginUrl;
    url.pathname = redirectPath;
    url.search = "";
    return finish(NextResponse.redirect(url));
  }

  if (user && isPublicMarketingPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = config.auth.afterLoginUrl;
    return finish(NextResponse.redirect(url));
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
    const isWriteApi = WRITE_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (isWriteMethod && isWriteApi && role === "monitor") {
      return NextResponse.json(
        { error: "Monitor CRA: acceso de solo lectura." },
        { status: 403 }
      );
    }
  }

  return finish(response);
}

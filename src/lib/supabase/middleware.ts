import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { isProtectedPath, isPublicApiPath } from "@/lib/app/routes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPaywallRedirect } from "@/plugins/stripe/paywall";

function isPublicMarketingPath(pathname: string) {
  return (
    pathname === config.auth.landingUrl ||
    pathname === routes.app.docs ||
    pathname.startsWith("/docs/")
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
  const { pathname } = request.nextUrl;

  const isLogin = pathname === config.auth.loginUrl;
  const isPublic =
    isPublicMarketingPath(pathname) || isLogin || isPublicApiPath(pathname);

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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

  response.headers.set("x-pathname", pathname);

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
    return NextResponse.redirect(url);
  }

  if (user && isPublicMarketingPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = config.auth.afterLoginUrl;
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = config.auth.loginUrl;
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedPath(pathname) && !pathname.startsWith("/account") && !pathname.startsWith("/settings")) {
    const paywallRedirect = await getPaywallRedirect(user.id, pathname);
    if (paywallRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = paywallRedirect.split("?")[0];
      const qs = paywallRedirect.split("?")[1];
      if (qs) {
        new URLSearchParams(qs).forEach((v, k) =>
          url.searchParams.set(k, v)
        );
      }
      return NextResponse.redirect(url);
    }
  }

  return response;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPaywallRedirect } from "@/plugins/stripe/paywall";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/webhooks/stripe",
  "/api/waitlist",
];

function isPublicPath(pathname: string) {
  if (pathname === config.auth.landingUrl) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
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

  const isPublic = isPublicPath(pathname);

  if (!isSupabaseConfigured()) {
    if (!isPublic && pathname !== "/login") {
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

  if (user && pathname === config.auth.loginUrl) {
    const url = request.nextUrl.clone();
    const from = request.nextUrl.searchParams.get("from");
    url.pathname =
      from && from.startsWith("/") && !from.startsWith("//")
        ? from
        : config.auth.afterLoginUrl;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === config.auth.landingUrl) {
    const url = request.nextUrl.clone();
    url.pathname = config.auth.afterLoginUrl;
    return NextResponse.redirect(url);
  }

  if (!isPublic && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = config.auth.loginUrl;
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isPublic && !pathname.startsWith("/account")) {
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

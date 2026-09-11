import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  resolveRateLimitRoute,
} from "@/lib/security/enforce-rate-limit";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: import("next/server").NextRequest) {
  const rateLimitRoute = resolveRateLimitRoute(
    request.nextUrl.pathname,
    request.method
  );

  if (rateLimitRoute) {
    const blocked = await enforceRateLimit(request, rateLimitRoute);
    if (blocked) return blocked;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

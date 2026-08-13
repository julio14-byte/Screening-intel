import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE } from "@/lib/auth/constants";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const user = cookieStore.get(USER_COOKIE);

  if (!session?.value) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    email: user?.value ?? null,
  });
}

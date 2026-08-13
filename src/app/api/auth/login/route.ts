import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getDemoCredentials,
  SESSION_COOKIE,
  USER_COOKIE,
} from "@/lib/auth/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  const demo = getDemoCredentials();
  if (
    email !== demo.email.toLowerCase() ||
    password !== demo.password
  ) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set(USER_COOKIE, email, {
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ email });
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDemoCredentials } from "@/lib/auth/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña requeridos." },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado en el servidor." },
      { status: 503 }
    );
  }

  const sessionCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

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
            sessionCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const demo = getDemoCredentials();
    if (
      email === demo.email.toLowerCase() &&
      password === demo.password
    ) {
      return NextResponse.json(
        {
          error:
            "Credenciales demo válidas pero el usuario no existe en Supabase Auth. " +
            "Crea el usuario en Authentication → Users (Auto Confirm).",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const jsonResponse = NextResponse.json({ email });
  sessionCookies.forEach(({ name, value, options }) =>
    jsonResponse.cookies.set(name, value, options)
  );

  return jsonResponse;
}

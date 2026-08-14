import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const demo = getDemoCredentials();
    if (
      email === demo.email.toLowerCase() &&
      password === demo.password
    ) {
      return NextResponse.json({
        error:
          "Credenciales demo válidas pero el usuario no existe en Supabase Auth. " +
          "Crea el usuario en Authentication → Users (Auto Confirm) o desactiva Confirm email y registrate.",
      });
    }
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({ email });
}

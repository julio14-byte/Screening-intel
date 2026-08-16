import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDemoCredentials } from "@/lib/auth/constants";
import { ensureDemoPatientData } from "@/lib/auth/demo-seed";
import { provisionDemoUserIfNeeded } from "@/lib/auth/demo-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type SessionCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applySessionCookies(
  response: NextResponse,
  sessionCookies: SessionCookie[]
) {
  sessionCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
}

export async function POST(request: NextRequest) {
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

  const sessionCookies: SessionCookie[] = [];

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

  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const provision = await provisionDemoUserIfNeeded(email, password);

    if (provision.ok) {
      sessionCookies.length = 0;
      const retry = await supabase.auth.signInWithPassword({ email, password });
      error = retry.error;
    } else if (provision.reason !== "not_demo") {
      const demo = getDemoCredentials();
      if (
        email === demo.email.toLowerCase() &&
        password === demo.password
      ) {
        return NextResponse.json({ error: provision.reason }, { status: 401 });
      }
    }
  }

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
            "Crea el usuario en Authentication → Users (Auto Confirm) o agrega SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const demo = getDemoCredentials();
  if (email === demo.email.toLowerCase()) {
    try {
      await ensureDemoPatientData();
    } catch (seedErr) {
      console.error("[login] demo seed:", (seedErr as Error)?.message);
    }
  }

  const jsonResponse = NextResponse.json({ email });
  applySessionCookies(jsonResponse, sessionCookies);

  return jsonResponse;
}

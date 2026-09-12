import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDemoCredentials, isDemoEmail } from "@/lib/auth/constants";
import { ensureDemoPatientData } from "@/lib/auth/demo-seed";
import { provisionDemoUserIfNeeded } from "@/lib/auth/demo-user";
import {
  applySessionActivityCookies,
  isDemoLoginEnabled,
  shouldSkipMfaForUser,
} from "@/lib/auth/session-policy";
import type { AppRole } from "@/lib/rbac/types";
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

  if (isDemoEmail(email) && !isDemoLoginEnabled()) {
    return NextResponse.json(
      { error: "El acceso demo no está disponible en este entorno." },
      { status: 403 }
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
      if (email === demo.email.toLowerCase() && password === demo.password) {
        return NextResponse.json({ error: provision.reason }, { status: 401 });
      }
    }
  }

  if (error) {
    const demo = getDemoCredentials();
    if (email === demo.email.toLowerCase() && password === demo.password) {
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

  if (isDemoEmail(email) && isDemoLoginEnabled()) {
    try {
      await ensureDemoPatientData();
    } catch (seedErr) {
      console.error("[login] demo seed:", (seedErr as Error)?.message);
    }
  }

  let mfaRequired = false;
  let mfaEnrollmentRequired = false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = (roleRow?.role as AppRole | undefined) ?? "coordinator";

    if (!shouldSkipMfaForUser(user.email, role)) {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel !== "aal2") {
        if (aal.nextLevel === "aal2") mfaRequired = true;
        else mfaEnrollmentRequired = true;
      }
    }
  }

  const jsonResponse = NextResponse.json({
    email,
    mfaRequired,
    mfaEnrollmentRequired,
  });
  applySessionCookies(jsonResponse, sessionCookies);
  applySessionActivityCookies(jsonResponse, request, Date.now(), {
    resetAbsolute: true,
  });

  return jsonResponse;
}

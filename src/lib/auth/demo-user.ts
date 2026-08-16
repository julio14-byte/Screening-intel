import { getDemoCredentials } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";

function isDemoLogin(email: string, password: string): boolean {
  const demo = getDemoCredentials();
  return (
    email.trim().toLowerCase() === demo.email.toLowerCase() &&
    password === demo.password
  );
}

/**
 * Crea o sincroniza el usuario demo en Supabase Auth (requiere service_role).
 * El trigger handle_new_user crea profile + organización al insertar en auth.users.
 */
export async function provisionDemoUserIfNeeded(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isDemoLogin(email, password)) {
    return { ok: false, reason: "not_demo" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      reason:
        "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. " +
        "Agrégala (Project Settings → API → service_role) o crea el usuario manualmente en Authentication.",
    };
  }

  const demo = getDemoCredentials();
  const normalizedEmail = demo.email.trim().toLowerCase();

  try {
    const admin = createAdminClient();

    const { error: createError } = await admin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
    });

    if (!createError) {
      return { ok: true };
    }

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return { ok: false, reason: createError.message };
    }

    const existing = listData.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );

    if (!existing) {
      return { ok: false, reason: createError.message };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        password: demo.password,
        email_confirm: true,
      }
    );

    if (updateError) {
      return { ok: false, reason: updateError.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al provisionar demo.";
    return { ok: false, reason: message };
  }
}

import { getDemoCredentials } from "@/lib/auth/constants";
import { isDemoLoginEnabled } from "@/lib/auth/session-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAAS_PLAN_LIMITS } from "@/plugins/stripe/plans";

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

  if (!isDemoLoginEnabled()) {
    return {
      ok: false,
      reason: "El acceso demo no está disponible en este entorno.",
    };
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

/**
 * Deja la organización de la cuenta demo en Pro+ (límites y status active).
 * Idempotente. Requiere SUPABASE_SERVICE_ROLE_KEY.
 */
export async function ensureDemoProPlusPlan(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const email = getDemoCredentials().email.trim().toLowerCase();
  const limits = SAAS_PLAN_LIMITS.pro_plus;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  let userId = profile?.id as string | undefined;

  if (!userId) {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      throw new Error(`demo plan: ${listError.message}`);
    }
    userId = listData.users.find(
      (user) => user.email?.toLowerCase() === email
    )?.id;
  }

  if (!userId) return;

  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`demo plan: ${membershipError.message}`);
  }

  const organizationId = membership?.organization_id as string | undefined;
  if (!organizationId) return;

  const trialEndsAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: orgError } = await admin
    .from("organizations")
    .update({
      plan_id: "pro_plus",
      subscription_status: "active",
      trial_ends_at: trialEndsAt,
      patient_limit: limits.patientLimit,
      protocol_limit: limits.protocolLimit,
      user_limit: limits.userLimit,
    })
    .eq("id", organizationId);

  if (orgError) {
    throw new Error(`demo plan: ${orgError.message}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ plan: "pro_plus" })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`demo plan: ${profileError.message}`);
  }
}

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

const DEMO_PRO_PLUS_PATCH = () => {
  const limits = SAAS_PLAN_LIMITS.pro_plus;
  return {
    plan_id: "pro_plus",
    subscription_status: "active",
    trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    patient_limit: limits.patientLimit,
    protocol_limit: limits.protocolLimit,
    user_limit: limits.userLimit,
  };
};

/**
 * Deja la org del usuario (o todas, en demo) en Pro+. Idempotente.
 * Requiere SUPABASE_SERVICE_ROLE_KEY.
 */
export async function ensureDemoProPlusPlan(userId?: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const patch = DEMO_PRO_PLUS_PATCH();

  let organizationId: string | undefined;

  if (userId) {
    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`demo plan: ${membershipError.message}`);
    }
    organizationId = membership?.organization_id as string | undefined;
  }

  if (!organizationId) {
    const { data: firstOrg, error: orgLookupError } = await admin
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (orgLookupError) {
      throw new Error(`demo plan: ${orgLookupError.message}`);
    }
    organizationId = firstOrg?.id as string | undefined;
  }

  if (!organizationId) return;

  const { error: orgError } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", organizationId);

  if (orgError) {
    throw new Error(`demo plan: ${orgError.message}`);
  }

  if (userId) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ plan: "pro_plus" })
      .eq("id", userId);

    if (profileError) {
      throw new Error(`demo plan: ${profileError.message}`);
    }
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "./types";

export interface CreateSiteUserInput {
  email: string;
  password: string;
  fullName: string;
  clinicalRole: AppRole;
  organizationId: string;
  invitedByUserId: string;
}

export class CreateSiteUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateSiteUserError";
  }
}

/**
 * Crea un usuario en Supabase Auth y lo vincula al research site del investigador.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo servidor).
 */
export async function createSiteUser(
  input: CreateSiteUserInput
): Promise<{ userId: string; email: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new CreateSiteUserError(
      "Falta SUPABASE_SERVICE_ROLE_KEY para crear usuarios."
    );
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new CreateSiteUserError("Email inválido.");
  }
  if (input.password.length < 8) {
    throw new CreateSiteUserError("La contraseña debe tener al menos 8 caracteres.");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName.trim() },
    });

  if (createError || !created.user) {
    throw new CreateSiteUserError(
      createError?.message ?? "No se pudo crear el usuario."
    );
  }

  const userId = created.user.id;

  try {
    const { data: ownedOrgs } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .eq("role", "owner");

    for (const row of ownedOrgs ?? []) {
      await admin
        .from("organizations")
        .delete()
        .eq("id", row.organization_id as string);
    }

    await admin.from("organization_members").insert({
      organization_id: input.organizationId,
      user_id: userId,
      role: "coordinator",
    });

    await admin
      .from("profiles")
      .update({
        email,
        full_name: input.fullName.trim(),
      })
      .eq("id", userId);

    await admin.from("user_roles").upsert(
      {
        user_id: userId,
        role: input.clinicalRole,
        assigned_by: input.invitedByUserId,
      },
      { onConflict: "user_id" }
    );

    return { userId, email };
  } catch (err) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    const message =
      err instanceof Error ? err.message : "Error al vincular el usuario.";
    throw new CreateSiteUserError(message);
  }
}

export async function getOrganizationIdForUser(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[rbac] getOrganizationIdForUser:", error.message);
    return null;
  }

  return (data?.organization_id as string | undefined) ?? null;
}

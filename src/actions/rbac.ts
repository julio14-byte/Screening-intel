"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSiteUser,
  getOrganizationIdForUser,
} from "@/lib/rbac/create-site-user";
import {
  getUserAppRole,
  listOrganizationMembersWithRoles,
} from "@/lib/rbac/get-user-role";
import { requirePermission } from "@/lib/rbac/require-permission";
import type { AppRole, OrganizationMemberWithRole } from "@/lib/rbac/types";

export async function getMembersWithRolesAction(): Promise<
  | { ok: true; members: OrganizationMemberWithRole[] }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requirePermission("roles:manage");
    const members = await listOrganizationMembersWithRoles(user.id);
    return { ok: true, members };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al cargar miembros",
    };
  }
}

export async function assignClinicalRoleAction(input: {
  userId: string;
  role: AppRole;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("roles:manage");

    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_user_clinical_role", {
      p_user_id: input.userId,
      p_role: input.role,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/settings/roles");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al asignar rol",
    };
  }
}

export async function getCurrentRoleAction(): Promise<{
  role: AppRole | null;
}> {
  const role = await getUserAppRole();
  return { role };
}

export async function createSiteUserAction(input: {
  email: string;
  password: string;
  fullName: string;
  clinicalRole: AppRole;
}): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requirePermission("roles:manage");

    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) {
      return {
        ok: false,
        error: "No se encontró la organización del research site.",
      };
    }

    const result = await createSiteUser({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      clinicalRole: input.clinicalRole,
      organizationId,
      invitedByUserId: user.id,
    });

    revalidatePath("/settings/roles");
    return { ok: true, ...result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al crear usuario",
    };
  }
}

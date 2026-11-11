import { createClient, getUser } from "@/lib/supabase/server";
import { roleFromRow } from "./parse-role";
import type { AppRole, OrganizationMemberWithRole } from "./types";

const DEFAULT_ROLE: AppRole = "coordinator";

/**
 * Rol clínico del usuario autenticado.
 * Sin fila, usa el mismo default que el trigger de alta (coordinador).
 * Si la consulta falla o el valor no es un rol conocido, devuelve null.
 */
export async function getUserAppRole(userId?: string): Promise<AppRole | null> {
  const uid = userId ?? (await getUser())?.id;
  if (!uid) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    console.error("[rbac] getUserAppRole:", error.message);
    return null;
  }

  const parsed = roleFromRow(data?.role);
  if (!parsed.ok) return parsed.reason === "missing" ? DEFAULT_ROLE : null;
  return parsed.role;
}

/** Contexto de sesión con rol para Server Components / Actions. */
export async function getAuthContext() {
  const user = await getUser();
  if (!user) return null;

  const role = await getUserAppRole(user.id);
  return { user, role };
}

/** Miembros de la organización con rol clínico (solo investigator). */
export async function listOrganizationMembersWithRoles(
  investigatorUserId: string
): Promise<OrganizationMemberWithRole[]> {
  const supabase = await createClient();

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", investigatorUserId)
    .limit(1)
    .maybeSingle();

  if (memberError || !membership?.organization_id) {
    return [];
  }

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", membership.organization_id);

  if (error || !members?.length) return [];

  const userIds = members.map((m) => m.user_id as string);

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name").in("id", userIds),
    supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  );
  const roleMap = new Map(
    (roles ?? []).map((r) => [r.user_id as string, r.role as AppRole])
  );

  return members.map((m) => {
    const p = profileMap.get(m.user_id as string);
    return {
      user_id: m.user_id as string,
      email: (p?.email as string | null) ?? null,
      full_name: (p?.full_name as string | null) ?? null,
      org_role: m.role as string,
      clinical_role: roleMap.get(m.user_id as string) ?? DEFAULT_ROLE,
    };
  });
}

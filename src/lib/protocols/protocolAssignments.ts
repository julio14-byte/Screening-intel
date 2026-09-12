import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationIdForUser } from "@/lib/rbac/create-site-user";
import type { AppRole, ProtocolAssignmentMember } from "@/lib/rbac/types";

export type { ProtocolAssignmentMember };

export async function listProtocolAssignmentMembers(input: {
  investigatorUserId: string;
  protocolId: string;
}): Promise<{ protocolTitle: string; members: ProtocolAssignmentMember[] }> {
  const orgId = await getOrganizationIdForUser(input.investigatorUserId);
  if (!orgId) {
    throw new Error("No se encontró la organización del clinical research site.");
  }

  const admin = createAdminClient();
  const { data: protocol, error: protocolError } = await admin
    .from("protocols")
    .select("id, title, clinic_id")
    .eq("id", input.protocolId)
    .maybeSingle();
  if (protocolError) throw new Error(protocolError.message);
  if (!protocol || protocol.clinic_id !== orgId) {
    throw new Error("Protocolo no encontrado.");
  }

  const { data: members, error: membersError } = await admin
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", orgId);
  if (membersError) throw new Error(membersError.message);

  const userIds = (members ?? []).map((m) => m.user_id as string);
  if (userIds.length === 0) {
    return { protocolTitle: protocol.title as string, members: [] };
  }
  const [{ data: profiles }, { data: roles }, { data: assignments }] =
    await Promise.all([
      admin.from("profiles").select("id, email, full_name").in("id", userIds),
      admin.from("user_roles").select("user_id, role").in("user_id", userIds),
      admin
        .from("protocol_assignments")
        .select("user_id, created_at")
        .eq("protocol_id", input.protocolId),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const roleMap = new Map(
    (roles ?? []).map((r) => [r.user_id as string, r.role as AppRole])
  );
  const assignedMap = new Map(
    (assignments ?? []).map((a) => [a.user_id as string, a.created_at as string])
  );

  return {
    protocolTitle: protocol.title as string,
    members: (members ?? []).map((m) => {
      const userId = m.user_id as string;
      const p = profileMap.get(userId);
      return {
        user_id: userId,
        email: (p?.email as string | null) ?? null,
        full_name: (p?.full_name as string | null) ?? null,
        org_role: m.role as string,
        clinical_role: roleMap.get(userId) ?? "coordinator",
        assigned: assignedMap.has(userId),
        assigned_at: assignedMap.get(userId) ?? null,
      };
    }),
  };
}

export async function setProtocolAssignment(input: {
  investigatorUserId: string;
  protocolId: string;
  targetUserId: string;
  assigned: boolean;
}): Promise<void> {
  const orgId = await getOrganizationIdForUser(input.investigatorUserId);
  if (!orgId) {
    throw new Error("No se encontró la organización del clinical research site.");
  }

  const admin = createAdminClient();
  const { data: protocol } = await admin
    .from("protocols")
    .select("id, clinic_id")
    .eq("id", input.protocolId)
    .maybeSingle();
  if (!protocol || protocol.clinic_id !== orgId) {
    throw new Error("Protocolo no encontrado.");
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", input.targetUserId)
    .maybeSingle();
  if (!membership) {
    throw new Error("Ese usuario no pertenece a tu centro.");
  }

  if (input.assigned) {
    const { error } = await admin.from("protocol_assignments").upsert(
      {
        protocol_id: input.protocolId,
        user_id: input.targetUserId,
        assigned_by: input.investigatorUserId,
      },
      { onConflict: "protocol_id,user_id" }
    );
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin
    .from("protocol_assignments")
    .delete()
    .eq("protocol_id", input.protocolId)
    .eq("user_id", input.targetUserId);
  if (error) throw new Error(error.message);
}

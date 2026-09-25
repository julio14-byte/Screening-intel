import { NextResponse } from "next/server";
import { firstEmbedded } from "@/lib/supabase/embed";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";
import type { IwrsAssignment, IwrsConfig, ProtocolArm } from "@/lib/iwrs/model";

type AssignmentRow = {
  id: string;
  organization_id: string;
  protocol_id: string;
  patient_id: string;
  screening_id: string;
  stratum: string;
  kit_code: string;
  randomized_at: string;
  randomized_by: string;
  unblinded_at: string | null;
  unblinded_by: string | null;
  unblind_reason: string;
  patients:
    | { first_name: string; last_name: string; subject_code?: string | null; gender?: string }
    | { first_name: string; last_name: string; subject_code?: string | null; gender?: string }[]
    | null;
  protocols:
    | { code_name: string; title: string }
    | { code_name: string; title: string }[]
    | null;
  iwrs_arm_assignments:
    | {
        arm_id: string;
        protocol_arms: { code: string; name: string } | { code: string; name: string }[] | null;
      }
    | {
        arm_id: string;
        protocol_arms: { code: string; name: string } | { code: string; name: string }[] | null;
      }[]
    | null;
};

function mapAssignment(row: AssignmentRow): IwrsAssignment & {
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
  protocol_title: string;
} {
  const patient = firstEmbedded(row.patients);
  const protocol = firstEmbedded(row.protocols);
  const assignment = firstEmbedded(row.iwrs_arm_assignments);
  const arm = assignment ? firstEmbedded(assignment.protocol_arms) : null;
  return {
    id: row.id,
    organization_id: row.organization_id,
    protocol_id: row.protocol_id,
    patient_id: row.patient_id,
    screening_id: row.screening_id,
    stratum: row.stratum,
    kit_code: row.kit_code,
    randomized_at: row.randomized_at,
    randomized_by: row.randomized_by,
    unblinded_at: row.unblinded_at,
    unblinded_by: row.unblinded_by,
    unblind_reason: row.unblind_reason,
    arm_id: assignment?.arm_id ?? null,
    arm_code: arm?.code ?? null,
    arm_name: arm?.name ?? null,
    arm_visible: Boolean(assignment?.arm_id),
    patient_name: patient
      ? `${patient.last_name}, ${patient.first_name}`
      : "Paciente",
    subject_code: patient?.subject_code ?? null,
    protocol_code: protocol?.code_name ?? "",
    protocol_title: protocol?.title ?? "",
  };
}

export async function GET(request: Request) {
  const gate = await iwrsContext("auth");
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");

  let configsQuery = gate.supabase
    .from("protocol_iwrs_config")
    .select(
      "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, updated_at"
    )
    .eq("organization_id", gate.organizationId);
  let armsQuery = gate.supabase
    .from("protocol_arms")
    .select(
      "id, organization_id, protocol_id, code, name, allocation_weight, sort_order, created_at"
    )
    .eq("organization_id", gate.organizationId)
    .order("sort_order")
    .order("code");
  let assignmentsQuery = gate.supabase
    .from("iwrs_randomizations")
    .select(
      "id, organization_id, protocol_id, patient_id, screening_id, stratum, kit_code, randomized_at, randomized_by, unblinded_at, unblinded_by, unblind_reason, patients(first_name, last_name, subject_code, gender), protocols(code_name, title), iwrs_arm_assignments(arm_id, protocol_arms(code, name))"
    )
    .eq("organization_id", gate.organizationId)
    .order("randomized_at", { ascending: false });

  if (protocolId) {
    configsQuery = configsQuery.eq("protocol_id", protocolId);
    armsQuery = armsQuery.eq("protocol_id", protocolId);
    assignmentsQuery = assignmentsQuery.eq("protocol_id", protocolId);
  }

  const [configsRes, armsRes, initialAssignments] = await Promise.all([
    configsQuery,
    armsQuery,
    assignmentsQuery,
  ]);

  let assignmentRows = (initialAssignments.data ?? []) as unknown as AssignmentRow[];
  let assignmentsError = initialAssignments.error;

  if (assignmentsError && /subject_code/i.test(assignmentsError.message)) {
    let legacy = gate.supabase
      .from("iwrs_randomizations")
      .select(
        "id, organization_id, protocol_id, patient_id, screening_id, stratum, kit_code, randomized_at, randomized_by, unblinded_at, unblinded_by, unblind_reason, patients(first_name, last_name, gender), protocols(code_name, title), iwrs_arm_assignments(arm_id, protocol_arms(code, name))"
      )
      .eq("organization_id", gate.organizationId)
      .order("randomized_at", { ascending: false });
    if (protocolId) legacy = legacy.eq("protocol_id", protocolId);
    const legacyRes = await legacy;
    assignmentRows = (legacyRes.data ?? []) as unknown as AssignmentRow[];
    assignmentsError = legacyRes.error;
  }

  if (configsRes.error) return iwrsSchemaErrorResponse(configsRes.error);
  if (armsRes.error) return iwrsSchemaErrorResponse(armsRes.error);
  if (assignmentsError) return iwrsSchemaErrorResponse(assignmentsError);

  return NextResponse.json({
    configs: (configsRes.data ?? []) as IwrsConfig[],
    arms: (armsRes.data ?? []) as ProtocolArm[],
    assignments: assignmentRows.map(mapAssignment),
  });
}

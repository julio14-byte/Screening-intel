import type { SupabaseClient } from "@supabase/supabase-js";
import { firstEmbedded } from "@/lib/supabase/embed";
import { IWRS_API_VERSION, IWRS_MODULE } from "@/lib/iwrs/paths";
import type { IwrsAssignment, IwrsConfig, ProtocolArm } from "@/lib/iwrs/model";

type IwrsDb = Pick<SupabaseClient, "from">;

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
  assignment_source?: string | null;
  external_id?: string | null;
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

export type IwrsCatalogAssignment = IwrsAssignment & {
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
  protocol_title: string;
};

export type IwrsKit = {
  id: string;
  organization_id: string;
  protocol_id: string;
  patient_id: string;
  kit_code: string;
};

export function mapIwrsAssignment(row: AssignmentRow): IwrsCatalogAssignment {
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
    assignment_source: row.assignment_source ?? "site",
    external_id: row.external_id ?? "",
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

function applyProtocol<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  protocolId?: string | null
): T {
  return protocolId ? query.eq("protocol_id", protocolId) : query;
}

/** Único lugar (además de RPCs) donde el módulo IWRS lee sus tablas. */
export async function listIwrsCatalog(
  supabase: IwrsDb,
  organizationId: string,
  protocolId?: string | null
) {
  let configsQuery = supabase
    .from("protocol_iwrs_config")
    .select(
      "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, source, sponsor_vendor, sponsor_study_id, sponsor_site_id, updated_at"
    )
    .eq("organization_id", organizationId);
  let armsQuery = supabase
    .from("protocol_arms")
    .select(
      "id, organization_id, protocol_id, code, name, allocation_weight, sort_order, created_at"
    )
    .eq("organization_id", organizationId)
    .order("sort_order")
    .order("code");
  let assignmentsQuery = supabase
    .from("iwrs_randomizations")
    .select(
      "id, organization_id, protocol_id, patient_id, screening_id, stratum, kit_code, randomized_at, randomized_by, unblinded_at, unblinded_by, unblind_reason, assignment_source, external_id, patients(first_name, last_name, subject_code, gender), protocols(code_name, title), iwrs_arm_assignments(arm_id, protocol_arms(code, name))"
    )
    .eq("organization_id", organizationId)
    .order("randomized_at", { ascending: false });

  configsQuery = applyProtocol(configsQuery, protocolId);
  armsQuery = applyProtocol(armsQuery, protocolId);
  assignmentsQuery = applyProtocol(assignmentsQuery, protocolId);

  const [initialConfigs, armsRes, initialAssignments] = await Promise.all([
    configsQuery,
    armsQuery,
    assignmentsQuery,
  ]);

  let configRows = (initialConfigs.data ?? []) as unknown as IwrsConfig[];
  let configsError = initialConfigs.error;
  if (
    configsError &&
    /source|sponsor_vendor|sponsor_study_id|sponsor_site_id/i.test(
      configsError.message
    )
  ) {
    let legacyConfigs = supabase
      .from("protocol_iwrs_config")
      .select(
        "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, updated_at"
      )
      .eq("organization_id", organizationId);
    legacyConfigs = applyProtocol(legacyConfigs, protocolId);
    const legacy = await legacyConfigs;
    configRows = (legacy.data ?? []) as unknown as IwrsConfig[];
    configsError = legacy.error;
  }

  let assignmentRows = (initialAssignments.data ?? []) as unknown as AssignmentRow[];
  let assignmentsError = initialAssignments.error;

  if (
    assignmentsError &&
    /subject_code|assignment_source|external_id/i.test(assignmentsError.message)
  ) {
    let legacy = supabase
      .from("iwrs_randomizations")
      .select(
        "id, organization_id, protocol_id, patient_id, screening_id, stratum, kit_code, randomized_at, randomized_by, unblinded_at, unblinded_by, unblind_reason, patients(first_name, last_name, gender), protocols(code_name, title), iwrs_arm_assignments(arm_id, protocol_arms(code, name))"
      )
      .eq("organization_id", organizationId)
      .order("randomized_at", { ascending: false });
    legacy = applyProtocol(legacy, protocolId);
    const legacyRes = await legacy;
    assignmentRows = (legacyRes.data ?? []) as unknown as AssignmentRow[];
    assignmentsError = legacyRes.error;
  }

  if (configsError) {
    return { error: configsError as { message: string; code?: string } };
  }
  if (armsRes.error) {
    return { error: armsRes.error as { message: string; code?: string } };
  }
  if (assignmentsError) {
    return { error: assignmentsError as { message: string; code?: string } };
  }

  return {
    module: IWRS_MODULE,
    version: IWRS_API_VERSION,
    configs: configRows.map((config) => ({
      ...config,
      source: config.source ?? "site",
      sponsor_vendor: config.sponsor_vendor ?? "",
      sponsor_study_id: config.sponsor_study_id ?? "",
      sponsor_site_id: config.sponsor_site_id ?? "",
    })),
    arms: (armsRes.data ?? []) as ProtocolArm[],
    assignments: assignmentRows.map(mapIwrsAssignment),
  };
}

export async function getIwrsKit(
  supabase: IwrsDb,
  organizationId: string,
  randomizationId: string
): Promise<{ data: IwrsKit | null; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabase
    .from("iwrs_randomizations")
    .select("id, organization_id, protocol_id, patient_id, kit_code")
    .eq("id", randomizationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return {
    data: (data as IwrsKit | null) ?? null,
    error,
  };
}

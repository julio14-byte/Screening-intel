import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import type { ClinicalProfile, Patient, Protocol } from "@/lib/types";
import { normalizeTerm, toPatientInitials } from "@/lib/utils";

let serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para las herramientas de IA."
    );
  }

  serviceClient = createClient(url, key);
  return serviceClient;
}

type ProfileRow = ClinicalProfile & {
  patients: Patient;
};

type ScreeningFailureRow = {
  patients: Patient | null;
};

function requireOrganizationId(organizationId: string | undefined): string | { error: string } {
  const id = organizationId?.trim();
  if (!id) {
    return { error: "Falta organizationId para consultar datos clínicos." };
  }
  return id;
}

function matchesCondition(conditions: string[], search: string): boolean {
  const term = normalizeTerm(search);
  return conditions.some(
    (condition) =>
      normalizeTerm(condition).includes(term) ||
      term.includes(normalizeTerm(condition))
  );
}

function patientLabel(patient: Patient): string {
  return toPatientInitials(patient.first_name, patient.last_name);
}

export type ScreeningStatusFilter =
  | "pre_screening"
  | "screening"
  | "randomized"
  | "screen_failure";

export async function searchPatientsByCriteria(input: {
  organizationId: string;
  condition?: string;
  status?: ScreeningStatusFilter;
}) {
  const organizationId = requireOrganizationId(input.organizationId);
  if (typeof organizationId !== "string") return organizationId;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("clinical_profiles")
    .select("*, patients!inner(*)")
    .eq("patients.clinic_id", organizationId);

  if (error) return { error: error.message };

  let rows = (data ?? []) as ProfileRow[];

  if (input.condition) {
    rows = rows.filter((row) =>
      matchesCondition(row.conditions, input.condition!)
    );
  }

  if (input.status) {
    const { data: screenings, error: screeningError } = await supabase
      .from("screenings")
      .select("patient_id, patients!inner(clinic_id)")
      .eq("status", input.status)
      .eq("patients.clinic_id", organizationId);

    if (screeningError) return { error: screeningError.message };

    const patientIds = new Set(
      (screenings ?? []).map((screening) => screening.patient_id)
    );
    rows = rows.filter((row) => patientIds.has(row.patient_id));
  }

  const names = rows.map((row) => patientLabel(row.patients));
  return { count: names.length, names };
}

export async function matchPatientsToProtocol(input: {
  organizationId: string;
  protocol_id: string;
}) {
  const organizationId = requireOrganizationId(input.organizationId);
  if (typeof organizationId !== "string") return organizationId;

  const supabase = getServiceSupabase();
  const { data: protocol, error: protoError } = await supabase
    .from("protocols")
    .select("*")
    .eq("id", input.protocol_id)
    .eq("clinic_id", organizationId)
    .single();

  if (protoError || !protocol) return { error: "Protocolo no encontrado" };

  const { data: profiles, error: profError } = await supabase
    .from("clinical_profiles")
    .select("*, patients!inner(*)")
    .eq("patients.clinic_id", organizationId);

  if (profError) return { error: profError.message };

  const results = ((profiles ?? []) as ProfileRow[]).map((row) => {
    const { patients: patient, ...profile } = row;
    const match = evaluatePatientAgainstProtocol(
      patient,
      profile,
      protocol as Protocol
    );

    return {
      patient_name: patientLabel(patient),
      status:
        match.verdict === "eligible"
          ? "CUMPLE"
          : match.verdict === "pending"
            ? "PENDIENTE"
            : "NO CUMPLE",
      score: match.score,
    };
  });

  return {
    protocol_title: protocol.title,
    total_evaluated: results.length,
    matches: results,
  };
}

export async function getScreenFailuresForRematch(input: {
  organizationId: string;
}) {
  const organizationId = requireOrganizationId(input.organizationId);
  if (typeof organizationId !== "string") return organizationId;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("screenings")
    .select("*, patients!inner(*), protocols(*)")
    .eq("status", "screen_failure")
    .eq("patients.clinic_id", organizationId);

  if (error) return { error: error.message };

  const names = ((data ?? []) as ScreeningFailureRow[])
    .map((screening) =>
      screening.patients ? patientLabel(screening.patients) : null
    )
    .filter((name): name is string => Boolean(name));

  return { count: names.length, names };
}

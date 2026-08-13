import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import type { ClinicalProfile, Patient, Protocol } from "@/lib/types";
import { normalizeTerm } from "@/lib/utils";

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

function matchesCondition(conditions: string[], search: string): boolean {
  const term = normalizeTerm(search);
  return conditions.some(
    (condition) =>
      normalizeTerm(condition).includes(term) ||
      term.includes(normalizeTerm(condition))
  );
}

function patientName(row: ProfileRow): string {
  const { patients: patient } = row;
  return `${patient.first_name} ${patient.last_name}`;
}

export type ScreeningStatusFilter =
  | "pre_screening"
  | "screening"
  | "randomized"
  | "screen_failure";

export async function searchPatientsByCriteria(input: {
  condition?: string;
  status?: ScreeningStatusFilter;
}) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("clinical_profiles")
    .select("*, patients(*)");

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
      .select("patient_id")
      .eq("status", input.status);

    if (screeningError) return { error: screeningError.message };

    const patientIds = new Set(
      (screenings ?? []).map((screening) => screening.patient_id)
    );
    rows = rows.filter((row) => patientIds.has(row.patient_id));
  }

  const names = rows.map(patientName);
  return { count: names.length, names };
}

export async function matchPatientsToProtocol(input: { protocol_id: string }) {
  const supabase = getServiceSupabase();
  const { data: protocol, error: protoError } = await supabase
    .from("protocols")
    .select("*")
    .eq("id", input.protocol_id)
    .single();

  if (protoError || !protocol) return { error: "Protocolo no encontrado" };

  const { data: profiles, error: profError } = await supabase
    .from("clinical_profiles")
    .select("*, patients(*)");

  if (profError) return { error: profError.message };

  const results = ((profiles ?? []) as ProfileRow[]).map((row) => {
    const { patients: patient, ...profile } = row;
    const match = evaluatePatientAgainstProtocol(
      patient,
      profile,
      protocol as Protocol
    );

    return {
      patient_name: `${patient.first_name} ${patient.last_name}`,
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

export async function getScreenFailuresForRematch() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("screenings")
    .select("*, patients(*), protocols(*)")
    .eq("status", "screen_failure");

  if (error) return { error: error.message };

  const names = (data ?? []).map(
    (screening) =>
      `${screening.patients.first_name} ${screening.patients.last_name}`
  );

  return { count: names.length, names };
}

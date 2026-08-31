import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import type {
  ClinicalProfile,
  Patient,
  Protocol,
  ScreeningStatus,
} from "@/lib/types";

const REFRESHABLE_STATUSES: ScreeningStatus[] = [
  "pre_screening",
  "screening",
];

export interface RematchRefreshResult {
  screeningsUpdated: number;
  rematchCandidates: number;
}

/**
 * Fase 2: tras actualizar perfil desde EHR, recalcula scores de matching
 * en screenings activos y cuenta oportunidades de re-match post screen failure.
 */
export async function refreshMatchScoresForPatient(
  supabase: SupabaseClient,
  patientId: string,
  clinicId: string
): Promise<RematchRefreshResult> {
  const { data: patientRow, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (patientError || !patientRow) {
    throw new Error(patientError?.message ?? "Paciente no encontrado.");
  }

  const { data: profileRow } = await supabase
    .from("clinical_profiles")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  const patient = patientRow as Patient;
  const profile = (profileRow as ClinicalProfile | null) ?? null;

  const [{ data: protocols }, { data: screenings }] = await Promise.all([
    supabase
      .from("protocols")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("status", "active"),
    supabase
      .from("screenings")
      .select("id, protocol_id, status")
      .eq("patient_id", patientId),
  ]);

  const activeProtocols = (protocols ?? []) as Protocol[];
  const patientScreenings = screenings ?? [];

  let screeningsUpdated = 0;

  for (const screening of patientScreenings) {
    if (!REFRESHABLE_STATUSES.includes(screening.status as ScreeningStatus)) {
      continue;
    }

    const protocol = activeProtocols.find((p) => p.id === screening.protocol_id);
    if (!protocol) continue;

    const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
    const { error } = await supabase
      .from("screenings")
      .update({
        match_score: result.score,
        match_details: result.details,
      })
      .eq("id", screening.id);

    if (!error) screeningsUpdated += 1;
  }

  const hasScreenFailure = patientScreenings.some(
    (s) => s.status === "screen_failure"
  );

  let rematchCandidates = 0;
  if (hasScreenFailure) {
    const enrolledProtocolIds = new Set(
      patientScreenings.map((s) => s.protocol_id)
    );

    rematchCandidates = activeProtocols
      .filter((protocol) => !enrolledProtocolIds.has(protocol.id))
      .map((protocol) =>
        evaluatePatientAgainstProtocol(patient, profile, protocol)
      )
      .filter((result) => result.verdict !== "excluded").length;
  }

  return { screeningsUpdated, rematchCandidates };
}

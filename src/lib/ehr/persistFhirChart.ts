import type { SupabaseClient } from "@supabase/supabase-js";
import type { EhrPatientPayload } from "./types";

const EHR_ID_SYSTEM = "urn:screenlane:identifier:ehr-patient-id";

/**
 * Escribe el chart FHIR (Identifier, Condition, MedicationStatement,
 * Observation) a partir del payload de ingreso. No cambia elegibilidad:
 * el matching sigue leyendo clinical_profiles.
 */
export async function persistFhirChart(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    patientId: string;
    payload: EhrPatientPayload;
    recordedBy?: string | null;
    mode: "replace" | "merge";
  }
): Promise<void> {
  const recordedBy = input.recordedBy ?? null;
  const now = new Date().toISOString();

  await upsertEhrIdentifier(supabase, {
    organizationId: input.organizationId,
    patientId: input.patientId,
    ehrPatientId: input.payload.ehr_patient_id,
  });

  const conditions = (input.payload.conditions ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const medications = (input.payload.medications ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const laboratories = input.payload.laboratories ?? {};

  if (input.mode === "replace" && conditions.length) {
    await supabase
      .from("conditions")
      .update({ clinical_status: "inactive" })
      .eq("patient_id", input.patientId)
      .eq("source", "ingest")
      .eq("clinical_status", "active");
  }

  if (input.mode === "replace" && medications.length) {
    await supabase
      .from("medication_statements")
      .update({ status: "stopped" })
      .eq("patient_id", input.patientId)
      .eq("source", "ingest")
      .eq("status", "active");
  }

  if (conditions.length) {
    const existing = input.mode === "merge" ? await activeConditionTexts(supabase, input.patientId) : new Set<string>();
    const rows = conditions
      .filter((text) => !existing.has(text.toLowerCase()))
      .map((code_text) => ({
        organization_id: input.organizationId,
        patient_id: input.patientId,
        clinical_status: "active",
        verification_status: "confirmed",
        code_text,
        recorded_at: now,
        recorded_by: recordedBy,
        source: "ingest",
      }));
    if (rows.length) {
      const { error } = await supabase.from("conditions").insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  if (medications.length) {
    const existing =
      input.mode === "merge" ? await activeMedicationTexts(supabase, input.patientId) : new Set<string>();
    const rows = medications
      .filter((text) => !existing.has(text.toLowerCase()))
      .map((medication_text) => ({
        organization_id: input.organizationId,
        patient_id: input.patientId,
        status: "active",
        medication_text,
        recorded_at: now,
        recorded_by: recordedBy,
        source: "ingest",
      }));
    if (rows.length) {
      const { error } = await supabase.from("medication_statements").insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  const labRows = Object.entries(laboratories)
    .filter(([, value]) => typeof value === "number" && !Number.isNaN(value))
    .map(([code_text, value_quantity]) => ({
      organization_id: input.organizationId,
      patient_id: input.patientId,
      status: "final",
      category: "laboratory",
      code_text,
      value_quantity,
      effective_at: now,
      issued_at: now,
      recorded_by: recordedBy,
      source: "ingest",
    }));

  if (labRows.length) {
    const { error } = await supabase.from("observations").insert(labRows);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("clinical_profiles")
    .update({ reconciled_at: now })
    .eq("patient_id", input.patientId);
}

async function upsertEhrIdentifier(
  supabase: SupabaseClient,
  input: { organizationId: string; patientId: string; ehrPatientId: string }
): Promise<void> {
  const { data: existing } = await supabase
    .from("patient_identifiers")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("system", EHR_ID_SYSTEM)
    .eq("value", input.ehrPatientId)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from("patient_identifiers").insert({
    organization_id: input.organizationId,
    patient_id: input.patientId,
    system: EHR_ID_SYSTEM,
    value: input.ehrPatientId,
    use: "usual",
    type_code: "MR",
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

async function activeConditionTexts(
  supabase: SupabaseClient,
  patientId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("conditions")
    .select("code_text")
    .eq("patient_id", patientId)
    .eq("clinical_status", "active");
  return new Set((data ?? []).map((row) => String(row.code_text).toLowerCase()));
}

async function activeMedicationTexts(
  supabase: SupabaseClient,
  patientId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("medication_statements")
    .select("medication_text")
    .eq("patient_id", patientId)
    .eq("status", "active");
  return new Set(
    (data ?? []).map((row) => String(row.medication_text).toLowerCase())
  );
}

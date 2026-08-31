import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeLaboratories, mergeStringArrays } from "./mergeProfile";
import type { EhrPatientPayload, EhrUpsertResult } from "./types";

export interface UpsertPatientFromEhrOptions {
  organizationId: string;
  ehrSource?: string;
  /** batch = reemplaza perfil clínico; webhook = merge incremental */
  profileMode: "replace" | "merge";
  patientLimit?: number;
}

/**
 * Crea o actualiza un paciente vinculado al EHR (clave: clinic_id + ehr_patient_id).
 */
export async function upsertPatientFromEhr(
  supabase: SupabaseClient,
  payload: EhrPatientPayload,
  options: UpsertPatientFromEhrOptions
): Promise<EhrUpsertResult> {
  const now = new Date().toISOString();
  const ehrSource = options.ehrSource ?? null;

  const { data: existing } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", options.organizationId)
    .eq("ehr_patient_id", payload.ehr_patient_id)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        first_name: payload.first_name,
        last_name: payload.last_name,
        birth_date: payload.birth_date,
        gender: payload.gender,
        ehr_source: ehrSource,
        ehr_last_synced_at: now,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const profileUpdated = await upsertClinicalProfile(
      supabase,
      existing.id,
      payload,
      options.profileMode
    );

    return {
      patientId: existing.id,
      action: "updated",
      profileUpdated,
    };
  }

  if (options.patientLimit != null) {
    const { count, error: countError } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", options.organizationId);

    if (countError) {
      throw new Error(countError.message);
    }
    if ((count ?? 0) >= options.patientLimit) {
      throw new Error(
        `Límite de pacientes del plan alcanzado (${options.patientLimit}).`
      );
    }
  }

  const { data: created, error: insertError } = await supabase
    .from("patients")
    .insert({
      clinic_id: options.organizationId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      birth_date: payload.birth_date,
      gender: payload.gender,
      ehr_patient_id: payload.ehr_patient_id,
      ehr_source: ehrSource,
      ehr_last_synced_at: now,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Error al crear paciente EHR.");
  }

  const profileUpdated = await upsertClinicalProfile(
    supabase,
    created.id,
    payload,
    "replace"
  );

  return {
    patientId: created.id,
    action: "created",
    profileUpdated,
  };
}

async function upsertClinicalProfile(
  supabase: SupabaseClient,
  patientId: string,
  payload: EhrPatientPayload,
  mode: "replace" | "merge"
): Promise<boolean> {
  const hasProfileData =
    (payload.conditions?.length ?? 0) > 0 ||
    (payload.medications?.length ?? 0) > 0 ||
    Object.keys(payload.laboratories ?? {}).length > 0;

  if (!hasProfileData) return false;

  const { data: existingProfile } = await supabase
    .from("clinical_profiles")
    .select("id, conditions, medications, laboratories")
    .eq("patient_id", patientId)
    .maybeSingle();

  const conditions =
    mode === "merge" && existingProfile
      ? mergeStringArrays(existingProfile.conditions ?? [], payload.conditions)
      : (payload.conditions ?? []);

  const medications =
    mode === "merge" && existingProfile
      ? mergeStringArrays(
          existingProfile.medications ?? [],
          payload.medications
        )
      : (payload.medications ?? []);

  const laboratories =
    mode === "merge" && existingProfile
      ? mergeLaboratories(
          (existingProfile.laboratories as Record<string, number>) ?? {},
          payload.laboratories,
          "merge"
        )
      : mergeLaboratories({}, payload.laboratories, "replace");

  if (existingProfile?.id) {
    const { error } = await supabase
      .from("clinical_profiles")
      .update({ conditions, medications, laboratories })
      .eq("id", existingProfile.id);
    if (error) throw new Error(error.message);
    return true;
  }

  const { error } = await supabase.from("clinical_profiles").insert({
    patient_id: patientId,
    conditions,
    medications,
    laboratories,
  });
  if (error) throw new Error(error.message);
  return true;
}

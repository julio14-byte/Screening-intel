"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ClinicalProfile, Patient } from "@/lib/types";

export interface ProfileUpdate {
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
}

export function usePatientDetail(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [profile, setProfile] = useState<ClinicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [patientRes, profileRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase
          .from("clinical_profiles")
          .select("*")
          .eq("patient_id", patientId)
          .maybeSingle(),
      ]);
      if (patientRes.error) throw patientRes.error;
      if (profileRes.error) throw profileRes.error;
      setPatient(patientRes.data as Patient);
      setProfile((profileRes.data as ClinicalProfile) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el paciente");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchDetail);
  }, [fetchDetail]);

  /** Crea o actualiza (upsert) el perfil clínico del paciente. */
  const saveProfile = useCallback(
    async (update: ProfileUpdate) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("clinical_profiles")
        .upsert(
          { patient_id: patientId, ...update },
          { onConflict: "patient_id" }
        );
      if (error) throw error;
      await fetchDetail();
    },
    [patientId, fetchDetail]
  );

  return { patient, profile, loading, error, saveProfile, refetch: fetchDetail };
}

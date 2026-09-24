"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { firstEmbedded } from "@/lib/supabase/embed";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PATIENT_WITH_PROFILE_COLUMNS } from "@/lib/supabase/query-columns";
import type {
  ClinicalProfile,
  Patient,
  PatientWithProfile,
} from "@/lib/types";

export interface PatientProfilePair {
  patient: Patient;
  profile: ClinicalProfile | null;
}

/** Trae toda la base de pacientes con su perfil clínico embebido (para el matcher). */
export function usePatientsWithProfiles() {
  const [pairs, setPairs] = useState<PatientProfilePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("patients")
        .select(PATIENT_WITH_PROFILE_COLUMNS)
        .order("last_name");
      if (error) throw error;
      const rows = (data ?? []) as unknown as PatientWithProfile[];
      setPairs(
        rows.map((row) => {
          const { clinical_profiles, ...patient } = row;
          return {
            patient: patient as Patient,
            profile: firstEmbedded(clinical_profiles),
          };
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchAll();
  }, [supabaseReady, fetchAll]);

  return { pairs, loading, error, refetch: fetchAll };
}

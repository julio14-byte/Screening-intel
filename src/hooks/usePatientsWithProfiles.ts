"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("patients")
        .select("*, clinical_profiles(*)")
        .order("last_name");
      if (error) throw error;
      const rows = (data ?? []) as unknown as PatientWithProfile[];
      setPairs(
        rows.map((row) => {
          const { clinical_profiles, ...patient } = row;
          return {
            patient: patient as Patient,
            profile: clinical_profiles?.[0] ?? null,
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
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchAll);
  }, [fetchAll]);

  return { pairs, loading, error, refetch: fetchAll };
}

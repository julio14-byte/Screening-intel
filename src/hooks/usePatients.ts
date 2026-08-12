"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Gender, Patient } from "@/lib/types";

export interface NewPatientInput {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPatients((data ?? []) as Patient[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchPatients);
  }, [fetchPatients]);

  const addPatient = useCallback(
    async (input: NewPatientInput) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("patients").insert(input);
      if (error) throw error;
      await fetchPatients();
    },
    [fetchPatients]
  );

  return { patients, loading, error, refetch: fetchPatients, addPatient };
}

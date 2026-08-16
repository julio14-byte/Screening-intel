"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
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
  const supabaseReady = useSupabaseReady();

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
    if (!supabaseReady) return;
    void fetchPatients();
  }, [supabaseReady, fetchPatients]);

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

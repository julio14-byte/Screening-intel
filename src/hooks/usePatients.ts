"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  PATIENT_CORE_COLUMNS,
  PATIENT_LIST_COLUMNS,
} from "@/lib/supabase/query-columns";
import { getSessionOrganizationId } from "@/lib/supabase/current-organization";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import {
  isMissingDemographicsColumn,
  type Ethnicity,
} from "@/lib/profile/demographics";
import type { Gender, Patient } from "@/lib/types";

export interface NewPatientInput {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  phone?: string;
  email?: string;
  ethnicity?: Ethnicity | "";
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
      const full = await supabase
        .from("patients")
        .select(PATIENT_LIST_COLUMNS)
        .order("created_at", { ascending: false });
      if (full.error && isMissingDemographicsColumn(full.error.message)) {
        const legacy = await supabase
          .from("patients")
          .select(PATIENT_CORE_COLUMNS)
          .order("created_at", { ascending: false });
        if (legacy.error) throw legacy.error;
        setPatients((legacy.data ?? []) as Patient[]);
      } else {
        if (full.error) throw full.error;
        setPatients((full.data ?? []) as Patient[]);
      }
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
      const clinic_id = await getSessionOrganizationId(supabase);
      const row = {
        clinic_id,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        birth_date: input.birth_date,
        gender: input.gender,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        ethnicity: input.ethnicity || null,
      };
      let { error } = await supabase.from("patients").insert(row);
      if (error && isMissingDemographicsColumn(error.message)) {
        const fallback = await supabase.from("patients").insert({
          clinic_id,
          first_name: row.first_name,
          last_name: row.last_name,
          birth_date: row.birth_date,
          gender: row.gender,
        });
        error = fallback.error;
        if (error && isMissingDemographicsColumn(error.message)) {
          throw new Error(
            "Faltan columnas demográficas. En Supabase SQL Editor ejecutá supabase/migrations/20260924140000_patient_demographics.sql y recargá el schema."
          );
        }
      }
      if (error) throw error;
      await fetchPatients();
    },
    [fetchPatients]
  );

  return { patients, loading, error, refetch: fetchPatients, addPatient };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import type { EproForm, EproResponseWithPatient } from "@/lib/types";

export function useEproForms() {
  const [forms, setForms] = useState<EproForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("epro_forms")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setForms((data ?? []) as EproForm[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar formularios ePRO");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchForms();
  }, [supabaseReady, fetchForms]);

  return { forms, loading, error, refetch: fetchForms };
}

export function useEproForm(formId: string) {
  const [form, setForm] = useState<EproForm | null>(null);
  const [responses, setResponses] = useState<EproResponseWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [formRes, respRes] = await Promise.all([
        supabase.from("epro_forms").select("*").eq("id", formId).single(),
        supabase
          .from("epro_responses")
          .select("*, patients(id, first_name, last_name)")
          .eq("form_id", formId)
          .order("submitted_at", { ascending: false }),
      ]);

      if (formRes.error) throw formRes.error;
      setForm(formRes.data as EproForm);
      setResponses((respRes.data ?? []) as EproResponseWithPatient[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar ePRO");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (!supabaseReady || !formId) return;
    void fetchAll();
  }, [supabaseReady, formId, fetchAll]);

  const submitResponse = useCallback(
    async (patientId: string, answers: Record<string, string | number | boolean>) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("epro_responses").upsert(
        { form_id: formId, patient_id: patientId, answers },
        { onConflict: "form_id,patient_id" }
      );
      if (error) throw error;
      await fetchAll();
    },
    [formId, fetchAll]
  );

  return { form, responses, loading, error, submitResponse, refetch: fetchAll };
}

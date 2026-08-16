"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import type {
  CriterionResult,
  ScreeningStatus,
  ScreeningWithRelations,
} from "@/lib/types";

const SCREENING_SELECT =
  "*, patients(*), protocols(id, title, code_name, status)";

export function useScreenings() {
  const [screenings, setScreenings] = useState<ScreeningWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();

  const fetchScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("screenings")
        .select(SCREENING_SELECT)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setScreenings((data ?? []) as unknown as ScreeningWithRelations[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar screenings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchScreenings();
  }, [supabaseReady, fetchScreenings]);

  const updateStatus = useCallback(
    async (screeningId: string, status: ScreeningStatus) => {
      // Actualización optimista para que el Kanban responda al instante.
      setScreenings((prev) =>
        prev.map((s) => (s.id === screeningId ? { ...s, status } : s))
      );
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("screenings")
        .update({ status })
        .eq("id", screeningId);
      if (error) {
        await fetchScreenings();
        throw error;
      }
    },
    [fetchScreenings]
  );

  return { screenings, loading, error, updateStatus, refetch: fetchScreenings };
}

/**
 * Registra (o actualiza) el screening de un paciente en un protocolo,
 * guardando el score y el detalle del match calculados por el motor de reglas.
 */
export async function upsertScreening(input: {
  patient_id: string;
  protocol_id: string;
  status?: ScreeningStatus;
  match_score: number;
  match_details: CriterionResult[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("screenings").upsert(
    {
      patient_id: input.patient_id,
      protocol_id: input.protocol_id,
      status: input.status ?? "pre_screening",
      match_score: input.match_score,
      match_details: input.match_details,
    },
    { onConflict: "patient_id,protocol_id" }
  );
  if (error) throw error;
}

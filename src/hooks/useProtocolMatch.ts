"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { getSupabaseClient } from "@/lib/supabase/client";
import { rankPatientsForProtocol } from "@/lib/matching";
import type { MatchResult, Protocol, Screening } from "@/lib/types";
import {
  usePatientsWithProfiles,
} from "./usePatientsWithProfiles";
import { upsertScreening } from "./useScreenings";

/**
 * Orquesta el matching de un protocolo: trae el protocolo, la base de
 * pacientes con perfiles y los screenings existentes, y expone el ranking
 * calculado por el motor de reglas más la acción de enrolar a pre-screening.
 */
export function useProtocolMatch(protocolId: string) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [existing, setExisting] = useState<Map<string, Screening>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();
  const { pairs, loading: pairsLoading, error: pairsError } =
    usePatientsWithProfiles();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [protocolRes, screeningsRes] = await Promise.all([
        supabase
          .from("protocols")
          .select(
            "id, clinic_id, title, code_name, inclusion_criteria, exclusion_criteria, status, created_at"
          )
          .eq("id", protocolId)
          .maybeSingle(),
        supabase
          .from("screenings")
          .select("id, patient_id, protocol_id, status, match_score")
          .eq("protocol_id", protocolId),
      ]);
      if (protocolRes.error) throw protocolRes.error;
      if (screeningsRes.error) throw screeningsRes.error;
      if (!protocolRes.data) {
        setProtocol(null);
        setError("Protocolo no encontrado");
        return;
      }
      setProtocol(protocolRes.data as Protocol);
      setExisting(
        new Map(
          ((screeningsRes.data ?? []) as Screening[]).map((s) => [
            s.patient_id,
            s,
          ])
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el protocolo");
    } finally {
      setLoading(false);
    }
  }, [protocolId]);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchData();
  }, [supabaseReady, fetchData]);

  const results: MatchResult[] = useMemo(() => {
    if (!protocol) return [];
    return rankPatientsForProtocol(pairs, protocol);
  }, [protocol, pairs]);

  /** Registra al paciente en pre-screening con el score/detalle calculados. */
  const enroll = useCallback(
    async (result: MatchResult) => {
      if (!protocol) return;
      await upsertScreening({
        patient_id: result.patient.id,
        protocol_id: protocol.id,
        match_score: result.score,
        match_details: result.details,
      });
      await fetchData();
    },
    [protocol, fetchData]
  );

  return {
    protocol,
    results,
    existing,
    loading: loading || pairsLoading,
    error: error ?? pairsError,
    enroll,
  };
}

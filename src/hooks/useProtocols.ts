"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  ExclusionCriteria,
  InclusionCriteria,
  Protocol,
  ProtocolStatus,
} from "@/lib/types";

export interface NewProtocolInput {
  title: string;
  code_name: string;
  inclusion_criteria: InclusionCriteria;
  exclusion_criteria: ExclusionCriteria;
  status: ProtocolStatus;
}

export function useProtocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProtocols((data ?? []) as Protocol[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar protocolos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchProtocols);
  }, [fetchProtocols]);

  const addProtocol = useCallback(
    async (input: NewProtocolInput) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("protocols").insert(input);
      if (error) throw error;
      await fetchProtocols();
    },
    [fetchProtocols]
  );

  const setProtocolStatus = useCallback(
    async (id: string, status: ProtocolStatus) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("protocols")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      await fetchProtocols();
    },
    [fetchProtocols]
  );

  return { protocols, loading, error, addProtocol, setProtocolStatus, refetch: fetchProtocols };
}

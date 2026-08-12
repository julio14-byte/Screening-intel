"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface DashboardStats {
  patients: number;
  activeProtocols: number;
  inPipeline: number; // pre_screening + screening
  randomized: number;
  screenFailures: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const count = (table: string) =>
        supabase.from(table).select("*", { count: "exact", head: true });

      const [patients, protocols, pipeline, randomized, failures] =
        await Promise.all([
          count("patients"),
          count("protocols").eq("status", "active"),
          count("screenings").in("status", ["pre_screening", "screening"]),
          count("screenings").eq("status", "randomized"),
          count("screenings").eq("status", "screen_failure"),
        ]);

      for (const res of [patients, protocols, pipeline, randomized, failures]) {
        if (res.error) throw res.error;
      }

      setStats({
        patients: patients.count ?? 0,
        activeProtocols: protocols.count ?? 0,
        inPipeline: pipeline.count ?? 0,
        randomized: randomized.count ?? 0,
        screenFailures: failures.count ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar métricas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchStats);
  }, [fetchStats]);

  return { stats, loading, error };
}

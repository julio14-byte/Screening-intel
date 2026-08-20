"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/lib/audit/types";

export function useAuditLogs(tableName: string, recordId: string) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: queryError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;
      setLogs((data ?? []) as AuditLog[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar la bitácora"
      );
    } finally {
      setLoading(false);
    }
  }, [tableName, recordId]);

  useEffect(() => {
    void Promise.resolve().then(fetchLogs);
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

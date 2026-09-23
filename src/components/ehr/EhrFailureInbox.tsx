"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type FailureRow = {
  id: string;
  sync_type: string;
  status: string;
  patients_failed: number;
  errors: string[];
  canRetry: boolean;
  started_at: string;
};

export function EhrFailureInbox() {
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ehr/failures");
    const json = await readJsonResponse<{ failures?: FailureRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar la bandeja.");
    setFailures(json?.failures ?? []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, [load]);

  async function act(logId: string, action: "ack" | "retry") {
    setBusyId(logId);
    setError(null);
    try {
      const res = await fetch("/api/ehr/failures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, action }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo completar la acción.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-rose-200 bg-white p-5">
      <h3 className="font-medium text-rose-900">Bandeja de fallos</h3>
      <p className="text-xs text-rose-800/80">
        Sync batch o webhook que no terminó. Reintentar vuelve a enviar solo los pacientes que fallaron.
      </p>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {failures.length === 0 ? (
        <p className="text-sm text-indigo-800">No hay fallos pendientes.</p>
      ) : (
        <ul className="space-y-3">
          {failures.map((row) => (
            <li key={row.id} className="rounded-lg bg-rose-50 px-3 py-2 text-sm">
              <p className="font-medium capitalize">
                {row.sync_type} · {row.status} · {row.patients_failed} con error
              </p>
              <p className="text-xs text-indigo-700">
                {new Date(row.started_at).toLocaleString("es")}
              </p>
              {row.errors.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-rose-900">
                  {row.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {row.canRetry ? (
                  <Button disabled={busyId === row.id} onClick={() => void act(row.id, "retry")}>
                    Reintentar
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void act(row.id, "ack")}
                >
                  Marcar revisado
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

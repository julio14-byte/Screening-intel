"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import { normalizeVisit, type VisitRow } from "@/lib/ops/visits";
import type { VisitKind } from "@/lib/ops/model";

export type NewVisitInput = {
  patient_id: string;
  protocol_id: string | null;
  scheduled_at: string;
  location: string;
  clinician_name: string;
  kind: VisitKind;
  notes: string;
  force?: boolean;
};

export class VisitConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitConflictError";
  }
}

export function useVisits(patientId?: string) {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetch(`/api/ops/visits${qs}`, { cache: "no-store" });
    const json = await readJsonResponse<{
      visits?: Parameters<typeof normalizeVisit>[0][];
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar las citas.");
    setVisits((json?.visits ?? []).map(normalizeVisit));
  }, [patientId]);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      await load();
    } catch (err) {
      setError(toErrorMessage(err, "No se pudieron cargar las citas."));
    }
  }, [load]);

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(toErrorMessage(err, "No se pudieron cargar las citas."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const createVisit = useCallback(
    async (input: NewVisitInput) => {
      const res = await fetch("/api/ops/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await readJsonResponse<{ error?: string; conflict?: boolean }>(res);
      if (res.status === 409 && json?.conflict) {
        throw new VisitConflictError(json.error ?? "Conflicto de horario.");
      }
      if (!res.ok) throw new Error(json?.error ?? "No se pudo agendar la cita.");
      await load();
    },
    [load]
  );

  const patchVisit = useCallback(
    async (id: string, body: Record<string, string>) => {
      const res = await fetch("/api/ops/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar la cita.");
      await load();
    },
    [load]
  );

  return { visits, loading, error, setError, refetch, createVisit, patchVisit };
}

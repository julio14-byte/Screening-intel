"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import type { EnrollmentTarget } from "@/lib/enrollment/targets";

type ListResponse = { targets?: EnrollmentTarget[]; error?: string };
type OneResponse = { target?: EnrollmentTarget; error?: string };

export function useEnrollmentTargets() {
  const [targets, setTargets] = useState<EnrollmentTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/enrollment-targets");
      const json = await readJsonResponse<ListResponse>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar las metas.");
      setTargets(json?.targets ?? []);
      setError(null);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudieron cargar las metas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (target: EnrollmentTarget) => {
    const res = await fetch("/api/enrollment-targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
    const json = await readJsonResponse<OneResponse>(res);
    if (!res.ok || !json?.target) {
      throw new Error(json?.error ?? "No se pudo guardar la meta.");
    }
    const saved = json.target;
    setTargets((prev) => [
      ...prev.filter((t) => t.protocol_id !== saved.protocol_id),
      saved,
    ]);
  }, []);

  const remove = useCallback(async (protocolId: string) => {
    const res = await fetch(
      `/api/enrollment-targets?protocol_id=${encodeURIComponent(protocolId)}`,
      { method: "DELETE" }
    );
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo quitar la meta.");
    setTargets((prev) => prev.filter((t) => t.protocol_id !== protocolId));
  }, []);

  return { targets, loading, error, save, remove };
}

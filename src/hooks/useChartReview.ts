"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import type { CriterionReview, ReviewInput } from "@/lib/chart-review/review";
import type { StructuredMedication } from "@/lib/chart-review/medications";

async function send<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJsonResponse<T & { error?: string }>(res);
  if (!res.ok || !json) throw new Error(json?.error ?? fallback);
  return json;
}

export function useChartReview(patientId: string, protocolId: string) {
  const [reviews, setReviews] = useState<CriterionReview[]>([]);
  const [medications, setMedications] = useState<StructuredMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chart-review?patient_id=${encodeURIComponent(patientId)}&protocol_id=${encodeURIComponent(protocolId)}`
      );
      const json = await readJsonResponse<{
        reviews?: CriterionReview[];
        medications?: StructuredMedication[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar la revisión.");
      setReviews(json?.reviews ?? []);
      setMedications(json?.medications ?? []);
      setError(null);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo cargar la revisión."));
    } finally {
      setLoading(false);
    }
  }, [patientId, protocolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addReview = useCallback(
    async (input: ReviewInput) => {
      const json = await send<{ review: CriterionReview }>(
        "/api/chart-review/reviews",
        "POST",
        input,
        "No se pudo registrar la revisión."
      );
      setReviews((prev) => [json.review, ...prev]);
    },
    []
  );

  const addMedication = useCallback(
    async (input: Record<string, unknown>) => {
      await send<{ medication: StructuredMedication }>(
        "/api/chart-review/medications",
        "POST",
        { patient_id: patientId, ...input },
        "No se pudo registrar el medicamento."
      );
      await load();
    },
    [patientId, load]
  );

  const updateMedication = useCallback(
    async (id: string, patch: { ended_on?: string | null; verified_on?: string | null }) => {
      await send<{ medication: StructuredMedication }>(
        "/api/chart-review/medications",
        "PATCH",
        { id, ...patch },
        "No se pudo actualizar el medicamento."
      );
      await load();
    },
    [load]
  );

  return { reviews, medications, loading, error, addReview, addMedication, updateMedication };
}

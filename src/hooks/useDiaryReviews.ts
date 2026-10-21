"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import type { DiaryInput, DiaryReview } from "@/lib/diary/review";

export function useDiaryReviews(patientId: string) {
  const [reviews, setReviews] = useState<DiaryReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/diary-review?patient_id=${encodeURIComponent(patientId)}`);
      const json = await readJsonResponse<{ reviews?: DiaryReview[]; error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar las revisiones del diario.");
      setReviews(json?.reviews ?? []);
      setError(null);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudieron cargar las revisiones del diario."));
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addReview = useCallback(
    async (input: DiaryInput) => {
      const res = await fetch("/api/diary-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await readJsonResponse<{ review?: DiaryReview; error?: string }>(res);
      if (!res.ok || !json?.review) {
        throw new Error(json?.error ?? "No se pudo registrar la revisión del diario.");
      }
      setReviews((prev) => [json.review as DiaryReview, ...prev]);
    },
    []
  );

  return { reviews, error, addReview, reload: load };
}

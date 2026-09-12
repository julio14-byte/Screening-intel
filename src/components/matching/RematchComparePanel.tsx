"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RematchCompareInput } from "@/lib/matching/generateRematchCompare";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

const MAX_ALTERNATIVES = 5;

export function RematchComparePanel({ input }: { input: RematchCompareInput }) {
  const [comparison, setComparison] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (input.alternatives.length === 0) return null;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matching/rematch-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...input,
          alternatives: input.alternatives.slice(0, MAX_ALTERNATIVES),
        }),
      });
      const data = await readJsonResponse<{
        comparison?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setComparison(data?.comparison ?? null);
    } catch {
      setError("Error de conexión al comparar protocolos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          Qué protocolo llamar primero (IA)
        </p>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={loading}
          onClick={() => void handleGenerate()}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Comparando…
            </>
          ) : comparison ? (
            "Regenerar"
          ) : (
            "Comparar alternativas"
          )}
        </Button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {comparison ? (
        <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-indigo-900">
          {comparison}
        </div>
      ) : !error && !loading ? (
        <p className="mt-2 text-[11px] text-indigo-500">
          Ordena los protocolos según el motor (eligible primero) y dice qué
          falta para la llamada. No cambia el semáforo.
        </p>
      ) : null}
    </div>
  );
}

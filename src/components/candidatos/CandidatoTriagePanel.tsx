"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export function CandidatoTriagePanel({ submissionId }: { submissionId: string }) {
  const [triage, setTriage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidatos/${submissionId}/triage`, {
        method: "POST",
        credentials: "include",
      });
      const data = await readJsonResponse<{ triage?: string; error?: string }>(
        res
      );
      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setTriage(data?.triage ?? null);
    } catch {
      setError("Error de conexión al generar el resumen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-200/80 bg-violet-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-900">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
          Briefing para la llamada (IA)
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
              Generando…
            </>
          ) : triage ? (
            "Regenerar"
          ) : (
            "Preparar llamada"
          )}
        </Button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {triage ? (
        <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-indigo-900">
          {triage}
        </div>
      ) : !error && !loading ? (
        <p className="mt-2 text-[11px] text-indigo-500">
          Resume notas y matching para la llamada. No cambia el semáforo ni
          convierte al candidato.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MatchRationaleInput } from "@/lib/matching/generateMatchRationale";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { cn } from "@/lib/utils";

export function MatchRationalePanel({
  input,
  compact = false,
  className,
}: {
  input: MatchRationaleInput;
  compact?: boolean;
  className?: string;
}) {
  const [rationale, setRationale] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matching/rationale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data = await readJsonResponse<{ rationale?: string; error?: string }>(
        res
      );
      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setRationale(data?.rationale ?? null);
    } catch {
      setError("Error de conexión al generar la justificación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-violet-200/80 bg-violet-50/40",
        compact ? "p-2.5" : "p-3",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-900">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
          Justificación clínica (IA)
        </p>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "text-xs",
            compact && "h-8 px-2.5 py-1"
          )}
          disabled={loading}
          onClick={() => void handleGenerate()}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Generando…
            </>
          ) : rationale ? (
            "Regenerar"
          ) : (
            "Generar explicación"
          )}
        </Button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {rationale ? (
        <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-indigo-900">
          {rationale}
        </div>
      ) : !error && !loading ? (
        <p className="mt-2 text-[11px] text-indigo-500">
          Resume el veredicto del motor de reglas en lenguaje clínico. No
          modifica la elegibilidad.
        </p>
      ) : null}
    </div>
  );
}

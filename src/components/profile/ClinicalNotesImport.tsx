"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ExtractedClinicalProfileDraft } from "@/lib/profile/extractClinicalProfileFromNotes";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

const PLACEHOLDER =
  "Ej: Paciente con HTA y DM2. Toma metformina 850 mg y enalapril 10 mg. " +
  "Última glucosa 142 mg/dL, HbA1c 7.2%, creatinina 1.1.";

export function ClinicalNotesImport({
  onExtracted,
}: {
  onExtracted: (draft: ExtractedClinicalProfileDraft) => void;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleExtract() {
    const text = notes.trim();
    if (!text) {
      setError("Pegá o escribí notas clínicas antes de extraer.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/patients/profile/extract", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });

      const data = await readJsonResponse<{
        draft?: ExtractedClinicalProfileDraft;
        charCount?: number;
        error?: string;
      }>(res);

      if (!res.ok || !data?.draft) {
        throw new Error(data?.error ?? "No se pudo extraer el perfil clínico.");
      }

      onExtracted(data.draft);
      setInfo(
        `Perfil pre-rellenado (${data.charCount ?? text.length} caracteres analizados). Revisá y editá antes de guardar.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar las notas."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
        <Sparkles className="h-4 w-4" aria-hidden />
        Notas clínicas → perfil estructurado (IA)
      </p>
      <p className="mt-1 text-xs text-cyan-800">
        Pegá texto libre para rellenar el formulario de condiciones, medicación
        y laboratorios. Revisá y editá antes de guardar.
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={4}
        className="mt-3 w-full rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        disabled={loading}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleExtract()}
          disabled={loading || !notes.trim()}
        >
          {loading ? "Analizando…" : "Extraer perfil con IA"}
        </Button>
        {notes.trim() ? (
          <button
            type="button"
            className="text-xs text-cyan-700 underline hover:text-cyan-900"
            onClick={() => {
              setNotes("");
              setError(null);
              setInfo(null);
            }}
          >
            Limpiar notas
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      ) : null}
      {info ? (
        <p className="mt-2 text-xs text-emerald-700">{info}</p>
      ) : null}
    </div>
  );
}

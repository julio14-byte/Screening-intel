"use client";

import { useRef, useState } from "react";
import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ExtractedProtocolDraft } from "@/lib/protocols/extractCriteria";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export function ProtocolPdfImport({
  onExtracted,
}: {
  onExtracted: (draft: ExtractedProtocolDraft) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/protocols/extract", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await readJsonResponse<{
        draft?: ExtractedProtocolDraft;
        textLength?: number;
        error?: string;
      }>(res);

      if (!res.ok || !data?.draft) {
        throw new Error(data?.error ?? "No se pudo extraer el protocolo.");
      }

      onExtracted(data.draft);
      setInfo(
        `Criterios extraídos (${data.textLength ?? 0} caracteres analizados). Revisá y editá antes de guardar.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar archivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Sparkles className="h-4 w-4" aria-hidden />
            Importar criterios con IA (Fase A)
          </p>
          <p className="mt-1 text-xs text-violet-700">
            Subí un PDF o TXT del protocolo. GPT-4o-mini extrae inclusión/exclusión
            y pre-rellena el formulario.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <FileUp className="h-4 w-4" aria-hidden />
          {loading ? "Analizando…" : "Subir PDF/TXT"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
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
"use client";

import { useRef, useState } from "react";
import { Camera, FileUp, TestTubes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ExtractedClinicalProfileDraft } from "@/lib/profile/extractClinicalProfileFromNotes";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type ExpedienteDocumentKind = "lab" | "prescription" | "auto";

export function ClinicalDocumentImport({
  onExtracted,
}: {
  onExtracted: (draft: ExtractedClinicalProfileDraft) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ExpedienteDocumentKind>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (file.size === 0) {
        throw new Error("El archivo está vacío.");
      }
      const mime = file.type.toLowerCase();
      if (mime === "image/heic" || mime === "image/heif") {
        throw new Error("Usa JPEG, PNG o WebP. HEIC no está soportado.");
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const res = await fetch("/api/patients/profile/extract-document", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await readJsonResponse<{
        draft?: ExtractedClinicalProfileDraft;
        source?: string;
        textLength?: number;
        error?: string;
      }>(res);

      if (!res.ok || !data?.draft) {
        throw new Error(data?.error ?? "No se pudo extraer el documento.");
      }

      onExtracted(data.draft);
      const labs = Object.keys(data.draft.laboratories).length;
      const meds = data.draft.medications.length;
      setInfo(
        `Pre-rellenado: ${labs} lab(s), ${meds} medicamento(s). Revisa y edita antes de guardar.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar el archivo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
        <TestTubes className="h-4 w-4" aria-hidden />
        Laboratorio PDF o foto de receta → expediente (ETL)
      </p>
      <p className="mt-1 text-xs text-violet-800">
        Extract del documento, transform a condiciones / medicación / labs, y
        load al perfil cuando guardes. La IA no cambia la elegibilidad. Un PDF
        escaneado sin texto: usa «Tomar foto».
      </p>

      <fieldset className="mt-3 flex flex-wrap gap-3 text-xs text-violet-900">
        <legend className="sr-only">Tipo de documento</legend>
        {(
          [
            ["auto", "Detectar"],
            ["lab", "Laboratorio"],
            ["prescription", "Receta"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="expediente-kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
              disabled={loading}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          <FileUp className="h-4 w-4" aria-hidden />
          {loading ? "Analizando…" : "Subir PDF o imagen"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => cameraRef.current?.click()}
          disabled={loading}
        >
          <Camera className="h-4 w-4" aria-hidden />
          Tomar foto
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {error ? (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {info ? <p className="mt-2 text-xs text-emerald-700">{info}</p> : null}
    </div>
  );
}

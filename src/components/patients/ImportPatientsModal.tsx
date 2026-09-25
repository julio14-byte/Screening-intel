"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/StateMessage";
import { PATIENT_CSV_TEMPLATE } from "@/lib/import/parsePatientCsv";
import {
  VENDOR_SCREENING_CSV_TEMPLATE,
  VENDOR_SCREENING_HINT,
  parseScreeningImportCsv,
} from "@/lib/import/vendorScreeningCsv";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export function ImportPatientsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const patients = parseScreeningImportCsv(text);

      const res = await fetch("/api/patients/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patients }),
      });

      const data = await readJsonResponse<{
        imported?: number;
        failed?: number;
        errors?: string[];
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data?.error ?? "Error al importar.");
      }

      const extra = (data?.errors ?? []).length
        ? ` ${data?.errors?.slice(0, 3).join(" ")}`
        : "";
      setResult(
        `Importados: ${data?.imported ?? 0}. Fallidos: ${data?.failed ?? 0}.${extra}`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar CSV.");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} title="Importar al screening (CSV)" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{VENDOR_SCREENING_HINT}</p>
        <p className="text-sm text-slate-600">
          Para el matcher necesitás demografía, antecedentes, medicación y labs de{" "}
          <strong>screening</strong> (DM + MH + CM + LB). El diario ePRO de Clinical Ink y el
          IRT de IQVIA no sustituyen ese expediente: el diario es síntoma en estudio; el IRT
          confirma randomización en Integraciones.
        </p>
        <p className="text-sm text-slate-600">
          Aceptamos la plantilla Crisvia o un CSV largo estilo CDISC (
          <code className="rounded bg-slate-100 px-1">USUBJID</code>,{" "}
          <code className="rounded bg-slate-100 px-1">BRTHDTC</code>,{" "}
          <code className="rounded bg-slate-100 px-1">SEX</code>,{" "}
          <code className="rounded bg-slate-100 px-1">MHTERM</code>,{" "}
          <code className="rounded bg-slate-100 px-1">CMTRT</code>,{" "}
          <code className="rounded bg-slate-100 px-1">LBTESTCD</code>,{" "}
          <code className="rounded bg-slate-100 px-1">LBSTRESN</code>
          ). Si el sujeto ya existe, se actualiza por código.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              downloadTemplate(PATIENT_CSV_TEMPLATE, "plantilla-pacientes.csv")
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            Plantilla Crisvia
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              downloadTemplate(
                VENDOR_SCREENING_CSV_TEMPLATE,
                "plantilla-edc-screening.csv"
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            Plantilla EDC (DM/MH/CM/LB)
          </Button>
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {loading ? "Importando…" : "Seleccionar CSV"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error ? <ErrorState message={error} /> : null}
        {result ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {result}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

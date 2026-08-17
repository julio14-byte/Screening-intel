"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/StateMessage";
import {
  PATIENT_CSV_TEMPLATE,
  parsePatientCsv,
} from "@/lib/import/parsePatientCsv";
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
      const patients = parsePatientCsv(text);

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

      setResult(
        `Importados: ${data?.imported ?? 0}. Fallidos: ${data?.failed ?? 0}.`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar CSV.");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([PATIENT_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-pacientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} title="Importar pacientes (CSV)" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Subí un CSV con columnas{" "}
          <code className="rounded bg-slate-100 px-1">first_name, last_name, birth_date, gender</code>
          . Opcional: <code className="rounded bg-slate-100 px-1">conditions</code>,{" "}
          <code className="rounded bg-slate-100 px-1">medications</code> y labs numéricos (
          <code className="rounded bg-slate-100 px-1">glucosa</code>,{" "}
          <code className="rounded bg-slate-100 px-1">hba1c</code>…).
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" aria-hidden />
            Descargar plantilla
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

"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Download, Upload } from "lucide-react";
import { EhrFailureInbox } from "@/components/ehr/EhrFailureInbox";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { EHR_CSV_TEMPLATE, parseEhrIngestText, parseLabPairs } from "@/lib/ehr/parseEhrIngest";
import type { EhrPatientPayload } from "@/lib/ehr/types";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { Gender } from "@/lib/types";

type EhrLog = {
  id: string;
  sync_type: string;
  status: string;
  patients_created: number;
  patients_updated: number;
  patients_failed: number;
  rematch_refreshed: number;
  started_at: string;
  completed_at: string | null;
};

type EhrSettingsData = {
  organization: {
    id: string;
    name: string;
    ehr_source: string | null;
  };
  recentLogs: EhrLog[];
};

type SyncResult = {
  created?: number;
  updated?: number;
  failed?: number;
  rematchRefreshed?: number;
  errors?: string[];
  error?: string;
};

const EMPTY_FORM = {
  ehr_patient_id: "",
  first_name: "",
  last_name: "",
  birth_date: "",
  gender: "female" as Gender,
  conditions: "",
  medications: "",
  laboratories: "",
};

function splitTerms(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function EhrSettingsPanel() {
  const [data, setData] = useState<EhrSettingsData | null>(null);
  const [source, setSource] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [batchText, setBatchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const batchId = useId();

  const applySettings = useCallback((json: EhrSettingsData) => {
    setData(json);
    setSource((current) => current || json.organization.ehr_source || "");
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings/ehr");
    const json = await readJsonResponse<EhrSettingsData & { error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "Error al cargar.");
    if (!json) throw new Error("Respuesta vacía.");
    return json;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applySettings(await fetchSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [applySettings, fetchSettings]);

  useEffect(() => {
    let cancelled = false;
    void fetchSettings()
      .then((json) => {
        if (!cancelled) applySettings(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applySettings, fetchSettings]);

  async function ingest(patients: EhrPatientPayload[]) {
    if (!patients.length) {
      throw new Error("No hay pacientes para ingresar.");
    }
    if (patients.length > 500) {
      throw new Error("Máximo 500 pacientes por lote.");
    }

    setIngesting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ehr/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ehr_source: source.trim() || undefined,
          patients,
        }),
      });
      const json = await readJsonResponse<SyncResult>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo ingresar.");

      const extra =
        json?.errors && json.errors.length > 0
          ? ` ${json.errors.slice(0, 3).join(" · ")}`
          : "";
      setResult(
        `Creados ${json?.created ?? 0}. Actualizados ${json?.updated ?? 0}. Fallidos ${json?.failed ?? 0}. Re-match ${json?.rematchRefreshed ?? 0}.${extra}`
      );
      applySettings(await fetchSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIngesting(false);
    }
  }

  async function submitOne(event: React.FormEvent) {
    event.preventDefault();
    await ingest([
      {
        ehr_patient_id: form.ehr_patient_id.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        birth_date: form.birth_date,
        gender: form.gender,
        conditions: splitTerms(form.conditions),
        medications: splitTerms(form.medications),
        laboratories: parseLabPairs(form.laboratories),
      },
    ]);
    setForm(EMPTY_FORM);
  }

  async function submitBatch() {
    try {
      const parsed = parseEhrIngestText(batchText);
      if (parsed.ehr_source && !source.trim()) {
        setSource(parsed.ehr_source);
      }
      await ingest(parsed.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      setBatchText(text);
      const parsed = parseEhrIngestText(text);
      if (parsed.ehr_source && !source.trim()) {
        setSource(parsed.ehr_source);
      }
      await ingest(parsed.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el archivo.");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([EHR_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plantilla-ingreso-ehr.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <ErrorState message={error} />
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Ingreso EHR</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cargá pacientes con el ID del expediente. Se actualizan por{" "}
            <code className="text-xs">ehr_patient_id</code> y se recalcula el
            matching. No hay webhooks ni recepción automática.
          </p>
        </div>

        <TextInput
          label="Origen (opcional)"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="epic, cerner, historia clínica, export CSV…"
        />

        {result ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {result}
          </p>
        ) : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Un paciente</h3>
        <form onSubmit={(event) => void submitOne(event)} className="space-y-4">
          <TextInput
            label="ID en el expediente"
            required
            value={form.ehr_patient_id}
            onChange={(event) =>
              setForm({ ...form, ehr_patient_id: event.target.value })
            }
            placeholder="EHR-1001"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Nombre"
              required
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
            />
            <TextInput
              label="Apellido"
              required
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
            />
            <TextInput
              label="Fecha de nacimiento"
              type="date"
              required
              value={form.birth_date}
              onChange={(event) =>
                setForm({ ...form, birth_date: event.target.value })
              }
            />
            <SelectInput
              label="Sexo"
              value={form.gender}
              onChange={(event) =>
                setForm({ ...form, gender: event.target.value as Gender })
              }
            >
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </SelectInput>
          </div>
          <TextInput
            label="Diagnósticos"
            hint="Separá con ;"
            value={form.conditions}
            onChange={(event) =>
              setForm({ ...form, conditions: event.target.value })
            }
            placeholder="diabetes tipo 2;hipertensión"
          />
          <TextInput
            label="Medicamentos"
            hint="Separá con ;"
            value={form.medications}
            onChange={(event) =>
              setForm({ ...form, medications: event.target.value })
            }
            placeholder="metformina;enalapril"
          />
          <TextInput
            label="Laboratorios"
            hint="clave:valor, separados por coma"
            value={form.laboratories}
            onChange={(event) =>
              setForm({ ...form, laboratories: event.target.value })
            }
            placeholder="glucosa:145, hba1c:7.8"
          />
          <Button type="submit" disabled={ingesting}>
            {ingesting ? "Ingresando…" : "Ingresar paciente"}
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Lote CSV o JSON</h3>
        <p className="text-xs text-muted-foreground">
          CSV con <code>ehr_patient_id</code> o JSON (un paciente, un array o{" "}
          <code>{`{ "patients": [...] }`}</code>). Hasta 500 por carga.
        </p>
        <Field label="Pegar lote" htmlFor={batchId}>
          <textarea
            id={batchId}
            value={batchText}
            onChange={(event) => setBatchText(event.target.value)}
            rows={8}
            className="w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 font-mono text-xs text-indigo-950 placeholder:text-violet-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder={EHR_CSV_TEMPLATE}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void submitBatch()}
            disabled={ingesting || !batchText.trim()}
          >
            Ingresar lote
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const input = document.getElementById("ehr-ingest-file");
              if (input instanceof HTMLInputElement) input.click();
            }}
            disabled={ingesting}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Subir archivo
          </Button>
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" aria-hidden />
            Plantilla CSV
          </Button>
          <input
            id="ehr-ingest-file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <EhrFailureInbox />

      {data && data.recentLogs.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">Últimos ingresos</h3>
          <ul className="space-y-2 text-sm">
            {data.recentLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="font-medium capitalize">{log.sync_type}</span>
                <span>{log.status}</span>
                <span>
                  +{log.patients_created} / ~{log.patients_updated} / ✕
                  {log.patients_failed}
                </span>
                {log.rematch_refreshed > 0 ? (
                  <span className="text-emerald-600">re-match</span>
                ) : null}
                <span className="w-full text-xs text-muted-foreground">
                  {new Date(log.started_at).toLocaleString("es")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

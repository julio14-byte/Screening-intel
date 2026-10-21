"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { toErrorMessage } from "@/lib/errors";
import {
  isMedicationActive,
  MED_SOURCE_LABELS,
  MED_SOURCE_TYPES,
  reconcileMedications,
  type ExclusionMedState,
  type MedSourceType,
  type StructuredMedication,
} from "@/lib/chart-review/medications";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<ExclusionMedState, string> = {
  blocked: "Lo toma actualmente",
  washout: "En periodo de lavado",
  clear: "Sin conflicto",
  unverified: "Sin medicación conciliada",
};

const STATE_STYLE: Record<ExclusionMedState, string> = {
  blocked: "bg-rose-50 text-rose-800",
  washout: "bg-amber-50 text-amber-900",
  clear: "bg-emerald-50 text-emerald-800",
  unverified: "bg-slate-100 text-slate-700",
};

const selectClass =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function MedicationReconciliation({
  medications,
  profileMedications,
  excludedMedications,
  washoutDays,
  canWrite,
  onAdd,
  onUpdate,
}: {
  medications: StructuredMedication[];
  profileMedications: string[];
  excludedMedications: string[];
  washoutDays: number | null | undefined;
  canWrite: boolean;
  onAdd: (input: Record<string, unknown>) => Promise<void>;
  onUpdate: (
    id: string,
    patch: { ended_on?: string | null; verified_on?: string | null }
  ) => Promise<void>;
}) {
  const result = useMemo(
    () => reconcileMedications(medications, profileMedications, excludedMedications, washoutDays),
    [medications, profileMedications, excludedMedications, washoutDays]
  );
  const [open, setOpen] = useState(false);
  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [startedOn, setStartedOn] = useState("");
  const [endedOn, setEndedOn] = useState("");
  const [sourceType, setSourceType] = useState<MedSourceType>("patient_interview");
  const [sourceRef, setSourceRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo completar la acción."));
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    run(async () => {
      await onAdd({
        drug_name: drug,
        dose: dose || null,
        started_on: startedOn || null,
        ended_on: endedOn || null,
        source_type: sourceType,
        source_ref: sourceRef || null,
        verified_on: todayIso(),
      });
      setDrug("");
      setDose("");
      setStartedOn("");
      setEndedOn("");
      setSourceRef("");
      setOpen(false);
    });

  return (
    <Card>
      <CardHeader
        title="Conciliación de medicamentos"
        description={
          washoutDays
            ? `Este protocolo pide ${washoutDays} días de lavado para la medicación excluyente.`
            : "Medicación vigente con fuente, contra la medicación excluyente del protocolo."
        }
        actions={
          canWrite && !open ? (
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Agregar medicamento
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {error ? <ErrorState message={error} /> : null}

        {open ? (
          <div className="space-y-3 rounded-md bg-violet-50/60 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput label="Medicamento" maxLength={160} value={drug} onChange={(e) => setDrug(e.target.value)} />
              <TextInput label="Dosis" maxLength={80} placeholder="500 mg c/12 h" value={dose} onChange={(e) => setDose(e.target.value)} />
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Fuente
                <select className={selectClass} value={sourceType} onChange={(e) => setSourceType(e.target.value as MedSourceType)}>
                  {MED_SOURCE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {MED_SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput label="Inicio" type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
              <TextInput label="Fin (si ya lo suspendió)" type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} />
              <TextInput label="Documento o referencia" maxLength={200} value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void add()} disabled={busy || drug.trim().length < 2}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {result.checks.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Medicación excluyente">
            {result.checks.map((c) => (
              <li key={c.excluded} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">Excluyente: {c.excluded}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATE_STYLE[c.state])}>
                    {STATE_LABEL[c.state]}
                  </span>
                </div>
                {c.state === "washout" && c.clearOn ? (
                  <p className="mt-1 text-amber-900">
                    Cumple el lavado el {c.clearOn} (faltan {c.daysLeft} días).
                  </p>
                ) : null}
                {c.evidence.length > 0 ? (
                  <p className="mt-1 text-slate-600">
                    Registro: {c.evidence.map((e, i) => (
                      <span key={i}>{i > 0 ? " · " : null}<q>{e}</q></span>
                    ))}
                  </p>
                ) : null}
                {c.state === "unverified" ? (
                  <p className="mt-1 text-slate-500">Registra la medicación del paciente para poder descartar el conflicto.</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {result.discrepancies.length > 0 ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">Diferencias entre el perfil y la medicación conciliada</p>
            <ul className="mt-1 list-disc pl-4">
              {result.discrepancies.map((d, i) => (
                <li key={i}>
                  {d.kind === "profile_only"
                    ? `${d.drug}: está en el perfil, pero no en la lista conciliada.`
                    : `${d.drug}: está conciliado como vigente, pero no aparece en el perfil.`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {medications.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay medicación conciliada para este paciente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Medicamento</th>
                  <th className="px-2 py-1 font-medium">Vigencia</th>
                  <th className="px-2 py-1 font-medium">Fuente</th>
                  <th className="px-2 py-1 font-medium">Verificado</th>
                  <th className="py-1 pl-2" />
                </tr>
              </thead>
              <tbody>
                {medications.map((m) => {
                  const active = isMedicationActive(m);
                  const stale = result.needsVerification.some((n) => n.id === m.id);
                  return (
                    <tr key={m.id} className="border-t border-slate-100 align-top">
                      <td className="py-1.5 pr-2 font-medium text-slate-900">
                        {m.drug_name}
                        {m.dose ? <span className="ml-1 font-normal text-slate-500">{m.dose}</span> : null}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums text-slate-700">
                        {m.started_on ?? "—"} → {m.ended_on ?? (active ? "vigente" : "—")}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">
                        {MED_SOURCE_LABELS[m.source_type]}
                        {m.source_ref ? ` · ${m.source_ref}` : ""}
                      </td>
                      <td className={cn("px-2 py-1.5 tabular-nums", stale ? "text-amber-700" : "text-slate-700")}>
                        {m.verified_on ?? "Sin verificar"}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        {canWrite ? (
                          <div className="flex justify-end gap-1">
                            {active && stale ? (
                              <Button variant="ghost" disabled={busy} onClick={() => void run(() => onUpdate(m.id, { verified_on: todayIso() }))}>
                                Verificar hoy
                              </Button>
                            ) : null}
                            {active && !m.ended_on ? (
                              <Button variant="ghost" disabled={busy} onClick={() => void run(() => onUpdate(m.id, { ended_on: todayIso() }))}>
                                Suspendido hoy
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

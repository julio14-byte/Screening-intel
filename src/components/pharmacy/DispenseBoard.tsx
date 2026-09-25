"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import { formatQuantity } from "@/lib/pharmacy/model";
import { FIRST_DOSE_MODE_LABEL, type FirstDoseMode } from "@/lib/pharmacy/dispense";
import { studySubjectCaption } from "@/lib/profile/demographics";
import { formatDate } from "@/lib/utils";

type Pending = {
  randomization_id: string;
  patient_id: string;
  protocol_id: string;
  kit_code: string;
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
};

type Med = {
  id: string;
  protocol_id: string;
  name: string;
  strength: string;
  unit: string;
};

type Lot = {
  id: string;
  protocol_id: string;
  study_medication_id: string;
  lot_number: string;
  quantity_on_hand: number;
};

type Dispensed = {
  id: string;
  patient_id: string;
  protocol_id: string;
  kit_code?: string;
  first_dose_at?: string | null;
  first_dose_mode?: FirstDoseMode | null;
  patient_name?: string;
  status: string;
};

export function DispenseBoard() {
  const { isReadOnly } = useRole();
  const [pending, setPending] = useState<Pending[]>([]);
  const [dispensed, setDispensed] = useState<Dispensed[]>([]);
  const [medications, setMedications] = useState<Med[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        medicationId: string;
        lotId: string;
        quantity: string;
        directions: string;
        mode: FirstDoseMode;
        at: string;
      }
    >
  >({});
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/pharmacy/dispense");
    const json = await readJsonResponse<{
      pending?: Pending[];
      dispensed?: Dispensed[];
      medications?: Med[];
      lots?: Lot[];
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar dispensación.");
    setPending(json?.pending ?? []);
    setDispensed(json?.dispensed ?? []);
    setMedications(json?.medications ?? []);
    setLots(json?.lots ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error de dispensación.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function draftFor(id: string) {
    return (
      drafts[id] ?? {
        medicationId: "",
        lotId: "",
        quantity: "1",
        directions: "Según protocolo",
        mode: "clinic" as FirstDoseMode,
        at: new Date().toISOString().slice(0, 16),
      }
    );
  }

  async function onDispense(event: FormEvent, row: Pending) {
    event.preventDefault();
    const draft = draftFor(row.randomization_id);
    setWorkingId(row.randomization_id);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          randomization_id: row.randomization_id,
          study_medication_id: draft.medicationId,
          lot_id: draft.lotId,
          quantity: draft.quantity,
          directions: draft.directions,
          first_dose_mode: draft.mode,
          first_dose_at: new Date(draft.at).toISOString(),
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo dispensar.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dispensar.");
    } finally {
      setWorkingId(null);
    }
  }

  async function createLink(patientId: string, protocolId: string, key: string) {
    setWorkingId(key);
    setError(null);
    try {
      const res = await fetch("/api/diario/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, protocol_id: protocolId }),
      });
      const json = await readJsonResponse<{ url?: string; error?: string }>(res);
      if (!res.ok || !json?.url) {
        throw new Error(json?.error ?? "No se pudo crear el link del diario.");
      }
      setLinks((prev) => ({ ...prev, [key]: json.url! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el link.");
    } finally {
      setWorkingId(null);
    }
  }

  const dosedToday = useMemo(
    () => dispensed.filter((row) => row.first_dose_at).length,
    [dispensed]
  );

  if (loading) return <LoadingState label="Cargando farmacia del estudio…" />;

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader
          title="Cajas a entregar"
          description="El IWRS ya asignó el número de caja. Farmacia elige el lote de stock y registra la primera dosis."
          actions={<Pill className="h-4 w-4 text-teal-600" aria-hidden />}
        />
        <CardBody>
          {pending.length === 0 ? (
            <EmptyState
              title="Nadie espera caja"
              description="Cuando un paciente se randomiza en /iwrs aparece acá el kit a entregar."
              action={
                <Link href="/iwrs" className="text-xs font-medium text-sky-700">
                  Ir a IWRS →
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {pending.map((row) => {
                const draft = draftFor(row.randomization_id);
                const meds = medications.filter(
                  (med) => med.protocol_id === row.protocol_id
                );
                const lotsFor = lots.filter(
                  (lot) =>
                    lot.protocol_id === row.protocol_id &&
                    lot.study_medication_id === draft.medicationId
                );
                const med = meds.find((item) => item.id === draft.medicationId);
                return (
                  <li
                    key={row.randomization_id}
                    className="rounded-md border border-teal-100 bg-white px-3 py-3"
                  >
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-indigo-950">
                          Entregar caja{" "}
                          <span className="font-mono text-teal-700">{row.kit_code}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          <Link
                            href={`/patients/${row.patient_id}`}
                            className="font-medium text-indigo-900 hover:text-violet-700"
                          >
                            {row.patient_name}
                          </Link>
                          {row.subject_code
                            ? ` · ${studySubjectCaption({ subject_code: row.subject_code })}`
                            : ""}{" "}
                          · {row.protocol_code}
                        </p>
                      </div>
                    </div>
                    {isReadOnly ? (
                      <p className="text-xs text-slate-400">Solo lectura</p>
                    ) : (
                      <form
                        onSubmit={(event) => void onDispense(event, row)}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        <SelectInput
                          label="Medicamento"
                          value={draft.medicationId}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: {
                                ...draft,
                                medicationId: e.target.value,
                                lotId: "",
                              },
                            }))
                          }
                          required
                        >
                          <option value="">Seleccionar</option>
                          {meds.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                              {item.strength ? ` ${item.strength}` : ""}
                            </option>
                          ))}
                        </SelectInput>
                        <SelectInput
                          label="Lote de stock"
                          value={draft.lotId}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: { ...draft, lotId: e.target.value },
                            }))
                          }
                          required
                          disabled={!draft.medicationId}
                        >
                          <option value="">Lote con stock</option>
                          {lotsFor.map((lot) => (
                            <option key={lot.id} value={lot.id}>
                              {lot.lot_number} ·{" "}
                              {formatQuantity(Number(lot.quantity_on_hand), med?.unit)}
                            </option>
                          ))}
                        </SelectInput>
                        <TextInput
                          label="Cantidad"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.quantity}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: {
                                ...draft,
                                quantity: e.target.value,
                              },
                            }))
                          }
                          required
                        />
                        <SelectInput
                          label="Primera dosis"
                          value={draft.mode}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: {
                                ...draft,
                                mode: e.target.value as FirstDoseMode,
                              },
                            }))
                          }
                        >
                          {(Object.keys(FIRST_DOSE_MODE_LABEL) as FirstDoseMode[]).map(
                            (key) => (
                              <option key={key} value={key}>
                                {FIRST_DOSE_MODE_LABEL[key]}
                              </option>
                            )
                          )}
                        </SelectInput>
                        <TextInput
                          label="Fecha y hora"
                          type="datetime-local"
                          value={draft.at}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: { ...draft, at: e.target.value },
                            }))
                          }
                          required
                        />
                        <TextInput
                          label="Indicaciones"
                          value={draft.directions}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.randomization_id]: {
                                ...draft,
                                directions: e.target.value,
                              },
                            }))
                          }
                        />
                        <div className="sm:col-span-2">
                          <Button
                            type="submit"
                            disabled={workingId === row.randomization_id}
                          >
                            {workingId === row.randomization_id
                              ? "Entregando…"
                              : "Entregar caja y registrar dosis"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Primera dosis hecha"
          description={`${dosedToday} registros con primera dosis. Generá el link del diario para que el paciente anote toma y síntomas.`}
        />
        <CardBody>
          {dispensed.filter((row) => row.first_dose_at).length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay primeras dosis.</p>
          ) : (
            <ul className="space-y-2">
              {dispensed
                .filter((row) => row.first_dose_at)
                .map((row) => {
                  const key = `${row.patient_id}:${row.id}`;
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-100 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-mono text-xs text-teal-700">
                          {row.kit_code || "Sin kit"}
                          {row.patient_name ? ` · ${row.patient_name}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.first_dose_mode
                            ? FIRST_DOSE_MODE_LABEL[row.first_dose_mode]
                            : "Primera dosis"}{" "}
                          · {row.first_dose_at ? formatDate(row.first_dose_at) : ""}
                        </p>
                        {links[key] ? (
                          <p className="mt-1 break-all font-mono text-[11px] text-violet-700">
                            {links[key]}
                          </p>
                        ) : null}
                      </div>
                      {!isReadOnly ? (
                        <Button
                          variant="secondary"
                          disabled={workingId === key}
                          onClick={() =>
                            void createLink(row.patient_id, row.protocol_id, key)
                          }
                        >
                          Link del diario
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

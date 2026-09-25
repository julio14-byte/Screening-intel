"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import {
  FOLLOW_UP_STATUS_LABEL,
  reimbursementTotal,
  type FollowUpStatus,
} from "@/lib/follow-up/model";
import type { Protocol } from "@/lib/types";

type Visit = {
  id: string;
  status: FollowUpStatus;
  protocol_deviation: boolean;
  overdue?: boolean;
  target_on: string;
  window_start_on: string;
  window_end_on: string;
  scheduled_on: string;
  actual_on: string | null;
  adherence_pct: number | null;
  adverse_event: boolean;
  transport_amount: number;
  meals_amount: number;
  currency: string;
  protocol_visit_schedules:
    | { visit_code: string; title: string }
    | { visit_code: string; title: string }[]
    | null;
  protocols: { code_name: string } | { code_name: string }[] | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function PatientFollowUpCard({
  patientId,
  protocols,
}: {
  patientId: string;
  protocols: Protocol[];
}) {
  const { isReadOnly } = useRole();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [protocolId, setProtocolId] = useState("");
  const [baselineOn, setBaselineOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const selectedProtocolId = protocolId || protocols[0]?.id || "";

  const load = useCallback(async () => {
    const res = await fetch(`/api/follow-up/visitas?patient_id=${patientId}`);
    const json = await readJsonResponse<{ visits?: Visit[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar las visitas.");
    setVisits(json?.visits ?? []);
  }, [patientId]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch((err) => setError(err instanceof Error ? err.message : "Error."));
  }, [load]);

  async function generate() {
    if (!selectedProtocolId) {
      setError("Elegí un protocolo.");
      return;
    }
    setError(null);
    const res = await fetch("/api/follow-up/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        protocol_id: selectedProtocolId,
        baseline_on: baselineOn || undefined,
      }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo generar el calendario.");
      return;
    }
    await load();
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Seguimiento del protocolo"
        description="Visitas obligatorias con ventana de tiempo. Completar exige signos vitales. Si la fecha real cae fuera de la ventana, se marca desviación de protocolo. Distinto de la agenda de consultas."
      />
      <CardBody className="space-y-3">
        {error ? <ErrorState message={error} /> : null}
        {!isReadOnly ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {protocols.length > 1 ? (
              <SelectInput
                label="Protocolo"
                value={selectedProtocolId}
                onChange={(e) => setProtocolId(e.target.value)}
              >
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.code_name}
                  </option>
                ))}
              </SelectInput>
            ) : null}
            <TextInput
              label="Día 0 (si no hay IWRS)"
              type="date"
              value={baselineOn}
              onChange={(e) => setBaselineOn(e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => void generate()}>
                Generar calendario
              </Button>
            </div>
          </div>
        ) : null}
        {visits.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay visitas de seguimiento.</p>
        ) : (
          <ul className="space-y-2">
            {visits.map((visit) => {
              const schedule = firstRel(visit.protocol_visit_schedules);
              const protocol = firstRel(visit.protocols);
              return (
                <li key={visit.id} className="rounded-md border border-violet-100 px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-950">
                        {schedule?.visit_code} · {schedule?.title}
                        {protocol ? ` · ${protocol.code_name}` : ""}
                      </p>
                      <p className="text-xs text-slate-600">
                        Objetivo {visit.target_on} · ventana {visit.window_start_on} →{" "}
                        {visit.window_end_on} · {FOLLOW_UP_STATUS_LABEL[visit.status]}
                        {visit.protocol_deviation ? " · desviación" : ""}
                        {visit.overdue ? " · vencida" : ""}
                        {visit.adherence_pct != null
                          ? ` · adherencia ${visit.adherence_pct}%`
                          : ""}
                      </p>
                    </div>
                    {!isReadOnly && visit.status === "scheduled" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setOpenId(openId === visit.id ? null : visit.id)}
                        >
                          Completar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            void fetch("/api/follow-up/visitas", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: visit.id, status: "missed" }),
                            }).then(() => load());
                          }}
                        >
                          Perdida
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {openId === visit.id ? (
                    <CompleteForm
                      visitId={visit.id}
                      onDone={() => {
                        setOpenId(null);
                        void load();
                      }}
                      onError={setError}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function CompleteForm({
  visitId,
  onDone,
  onError,
}: {
  visitId: string;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const [actualOn, setActualOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [heartRate, setHeartRate] = useState("72");
  const [temperature, setTemperature] = useState("36.5");
  const [weight, setWeight] = useState("");
  const [dispensed, setDispensed] = useState("28");
  const [returned, setReturned] = useState("0");
  const [ae, setAe] = useState(false);
  const [aeNotes, setAeNotes] = useState("");
  const [transport, setTransport] = useState("0");
  const [meals, setMeals] = useState("0");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const res = await fetch("/api/follow-up/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: visitId,
          actual_on: actualOn,
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          heart_rate: Number(heartRate),
          temperature: temperature ? Number(temperature) : null,
          weight_kg: weight ? Number(weight) : null,
          pills_dispensed: Number(dispensed),
          pills_returned: Number(returned),
          adverse_event: ae,
          adverse_event_notes: aeNotes,
          transport_amount: Number(transport),
          meals_amount: Number(meals),
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo completar.");
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo completar.");
    } finally {
      setSaving(false);
    }
  }

  const total = reimbursementTotal(Number(transport) || 0, Number(meals) || 0);

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-3 grid gap-2 sm:grid-cols-4">
      <TextInput
        label="Fecha real"
        type="date"
        value={actualOn}
        onChange={(e) => setActualOn(e.target.value)}
        required
      />
      <TextInput
        label="PAS (mmHg)"
        type="number"
        value={systolic}
        onChange={(e) => setSystolic(e.target.value)}
        required
      />
      <TextInput
        label="PAD (mmHg)"
        type="number"
        value={diastolic}
        onChange={(e) => setDiastolic(e.target.value)}
        required
      />
      <TextInput
        label="FC (lpm)"
        type="number"
        value={heartRate}
        onChange={(e) => setHeartRate(e.target.value)}
        required
      />
      <TextInput
        label="Temp (°C)"
        type="number"
        step="0.1"
        value={temperature}
        onChange={(e) => setTemperature(e.target.value)}
      />
      <TextInput
        label="Peso (kg)"
        type="number"
        step="0.1"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      <TextInput
        label="Pastillas entregadas"
        type="number"
        value={dispensed}
        onChange={(e) => setDispensed(e.target.value)}
        required
      />
      <TextInput
        label="Pastillas devueltas"
        type="number"
        value={returned}
        onChange={(e) => setReturned(e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-sm text-indigo-950 sm:col-span-4">
        <input type="checkbox" checked={ae} onChange={(e) => setAe(e.target.checked)} />
        Evento adverso desde la última visita
      </label>
      {ae ? (
        <div className="sm:col-span-4">
          <TextArea
            label="Descripción del evento adverso"
            value={aeNotes}
            onChange={(e) => setAeNotes(e.target.value)}
            required
          />
        </div>
      ) : null}
      <TextInput
        label="Viático transporte"
        type="number"
        min={0}
        step="0.01"
        value={transport}
        onChange={(e) => setTransport(e.target.value)}
      />
      <TextInput
        label="Viático comidas"
        type="number"
        min={0}
        step="0.01"
        value={meals}
        onChange={(e) => setMeals(e.target.value)}
      />
      <p className="self-end text-xs text-slate-500 sm:col-span-2">
        Reembolso total: {total.toFixed(2)}
      </p>
      <div className="sm:col-span-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar visita"}
        </Button>
      </div>
    </form>
  );
}

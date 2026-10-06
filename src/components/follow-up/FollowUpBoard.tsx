"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { FOLLOW_UP_STATUS_LABEL, type FollowUpStatus } from "@/lib/follow-up/model";
import { toPatientInitials } from "@/lib/utils";

type Visit = {
  id: string;
  patient_id: string;
  status: FollowUpStatus;
  protocol_deviation: boolean;
  overdue?: boolean;
  target_on: string;
  window_start_on: string;
  window_end_on: string;
  adherence_pct: number | null;
  patients:
    | { subject_code: string | null; first_name: string; last_name: string }
    | { subject_code: string | null; first_name: string; last_name: string }[]
    | null;
  protocols: { code_name: string } | { code_name: string }[] | null;
  protocol_visit_schedules:
    | { visit_code: string; title: string }
    | { visit_code: string; title: string }[]
    | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function FollowUpBoard() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/follow-up/visitas");
    const json = await readJsonResponse<{ visits?: Visit[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el seguimiento.");
    setVisits(json?.visits ?? []);
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch((err) => setError(err instanceof Error ? err.message : "Error."))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <LoadingState label="Cargando seguimiento…" />;
  if (error) return <ErrorState message={error} />;

  const deviations = visits.filter((row) => row.protocol_deviation);
  const overdue = visits.filter((row) => row.overdue);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Visitas cargadas</p>
            <p className="text-2xl font-semibold text-indigo-950">{visits.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Fuera de ventana / perdidas</p>
            <p className="text-2xl font-semibold text-rose-700">{deviations.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Ventana vencida (aún programadas)</p>
            <p className="text-2xl font-semibold text-amber-700">{overdue.length}</p>
          </CardBody>
        </Card>
      </div>
      {visits.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              Todavía no hay calendarios generados. Definí las visitas en el protocolo y generá el
              seguimiento desde el expediente del paciente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-2">
          {visits.map((visit) => {
            const patient = firstRel(visit.patients);
            const schedule = firstRel(visit.protocol_visit_schedules);
            const protocol = firstRel(visit.protocols);
            const label = patient?.subject_code
              ? `Sujeto ${patient.subject_code}`
              : patient
                ? toPatientInitials(patient.first_name, patient.last_name)
                : "Sujeto";
            return (
              <li key={visit.id}>
                <Card>
                  <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-950">
                        {label} · {schedule?.visit_code} {schedule?.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        {protocol?.code_name} · objetivo {visit.target_on} ·{" "}
                        {FOLLOW_UP_STATUS_LABEL[visit.status]}
                        {visit.protocol_deviation ? " · desviación de protocolo" : ""}
                        {visit.overdue ? " · vencida" : ""}
                      </p>
                    </div>
                    <Link
                      href={`/patients/${visit.patient_id}`}
                      className="text-xs font-medium text-violet-700 hover:underline"
                    >
                      Abrir expediente
                    </Link>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

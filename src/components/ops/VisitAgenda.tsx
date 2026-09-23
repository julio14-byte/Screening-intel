"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toPatientInitials } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { useProtocols } from "@/hooks/useProtocols";
import { useRole } from "@/contexts/role-context";

type VisitRow = {
  id: string;
  scheduled_at: string;
  location: string;
  status: string;
  notes: string;
  patients: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  protocols: { code_name: string } | { code_name: string }[] | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  completed: "Hecha",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

function firstRel<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function VisitAgenda() {
  const { isReadOnly } = useRole();
  const { patients } = usePatients();
  const { protocols } = useProtocols();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/ops/visits");
    const json = await readJsonResponse<{ visits?: VisitRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar la agenda.");
    setVisits(json?.visits ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Error de agenda."))
      .finally(() => setLoading(false));
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!patientId || !when) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          protocol_id: protocolId || null,
          scheduled_at: new Date(when).toISOString(),
          location,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo agendar.");
      setWhen("");
      setLocation("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agendar.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setError(null);
    const res = await fetch("/api/ops/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo actualizar la visita.");
      return;
    }
    await load();
  }

  if (loading) return <LoadingState label="Cargando agenda…" />;

  return (
    <div className="space-y-5">
      {error ? <ErrorState message={error} /> : null}
      {isReadOnly ? null : (
        <Card>
          <CardHeader title="Nueva visita" description="Pre-screening. Tú confirmas fecha y sede." />
          <CardBody>
            <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
              <SelectInput label="Paciente" value={patientId} onChange={(event) => setPatientId(event.target.value)} required>
                <option value="">Elegir</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {toPatientInitials(patient.first_name, patient.last_name)}
                  </option>
                ))}
              </SelectInput>
              <SelectInput label="Protocolo" value={protocolId} onChange={(event) => setProtocolId(event.target.value)}>
                <option value="">Sin protocolo</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.code_name}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Fecha y hora"
                type="datetime-local"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                required
              />
              <TextInput
                label="Sede"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Consultorio 2"
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Agendar"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {visits.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-indigo-800">Todavía no hay visitas. Agenda la primera desde el formulario.</p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visits.map((visit) => {
            const patient = firstRel(visit.patients);
            const protocol = firstRel(visit.protocols);
            const initials = patient
              ? toPatientInitials(patient.first_name, patient.last_name)
              : "?. ?.";
            return (
              <li key={visit.id}>
                <Card>
                  <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-950">
                        {initials}
                        {protocol ? ` · ${protocol.code_name}` : ""}
                      </p>
                      <p className="text-xs text-indigo-700">
                        {new Date(visit.scheduled_at).toLocaleString("es")}
                        {visit.location ? ` · ${visit.location}` : ""} · {STATUS_LABEL[visit.status] ?? visit.status}
                      </p>
                    </div>
                    {isReadOnly || visit.status !== "scheduled" ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => void setStatus(visit.id, "completed")}>
                          Hecha
                        </Button>
                        <Button variant="ghost" onClick={() => void setStatus(visit.id, "no_show")}>
                          No asistió
                        </Button>
                        <Button variant="ghost" onClick={() => void setStatus(visit.id, "cancelled")}>
                          Cancelar
                        </Button>
                      </div>
                    )}
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

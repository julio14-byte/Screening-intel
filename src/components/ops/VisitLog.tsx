"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  VISIT_KIND_LABEL,
  VISIT_KINDS,
  VISIT_NOTES_MAX,
  VISIT_STATUS_LABEL,
  type VisitKind,
  type VisitStatus,
} from "@/lib/ops/model";
import { toPatientInitials } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { useProtocols } from "@/hooks/useProtocols";
import { useRole } from "@/contexts/role-context";

type VisitRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  location: string;
  status: VisitStatus;
  notes: string;
  kind: VisitKind | string;
  clinician_name: string;
  patients:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
  protocols: { code_name: string } | { code_name: string }[] | null;
};

function firstRel<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function kindLabel(kind: string): string {
  return VISIT_KIND_LABEL[kind as VisitKind] ?? kind;
}

export function VisitLog({
  patientId,
  title = "Nueva visita",
  description = "Registra la consulta con el médico y deja la nota clínica.",
}: {
  patientId?: string;
  title?: string;
  description?: string;
}) {
  const { isReadOnly } = useRole();
  const { patients } = usePatients();
  const { protocols } = useProtocols();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [protocolId, setProtocolId] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [clinician, setClinician] = useState("");
  const [kind, setKind] = useState<VisitKind>("consulta");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const qs = patientId ? `?patient_id=${patientId}` : "";
    const res = await fetch(`/api/ops/visits${qs}`);
    const json = await readJsonResponse<{ visits?: VisitRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar las visitas.");
    setVisits(json?.visits ?? []);
  }, [patientId]);

  useEffect(() => {
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error de visitas.")
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (patientId) setSelectedPatientId(patientId);
  }, [patientId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!selectedPatientId || !when) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          protocol_id: protocolId || null,
          scheduled_at: new Date(when).toISOString(),
          location,
          clinician_name: clinician,
          kind,
          notes,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la visita.");
      setWhen("");
      setLocation("");
      setClinician("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la visita.");
    } finally {
      setSaving(false);
    }
  }

  async function patchVisit(id: string, body: Record<string, string>) {
    setError(null);
    const res = await fetch("/api/ops/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo actualizar la visita.");
      return;
    }
    await load();
  }

  if (loading) return <LoadingState label="Cargando visitas…" />;

  return (
    <div className="space-y-5">
      {error ? <ErrorState message={error} /> : null}
      {isReadOnly ? null : (
        <Card>
          <CardHeader title={title} description={description} />
          <CardBody>
            <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
              {patientId ? null : (
                <SelectInput
                  label="Paciente"
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  required
                >
                  <option value="">Elegir</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {toPatientInitials(patient.first_name, patient.last_name)}
                    </option>
                  ))}
                </SelectInput>
              )}
              <SelectInput
                label="Tipo"
                value={kind}
                onChange={(event) => setKind(event.target.value as VisitKind)}
              >
                {VISIT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {VISIT_KIND_LABEL[value]}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                label="Protocolo"
                value={protocolId}
                onChange={(event) => setProtocolId(event.target.value)}
              >
                <option value="">Sin protocolo</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.code_name}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Médico"
                value={clinician}
                onChange={(event) => setClinician(event.target.value)}
                placeholder="Dr. Pérez"
              />
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
                <TextArea
                  label="Nota clínica"
                  value={notes}
                  maxLength={VISIT_NOTES_MAX}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Motivo, indicaciones, próximos pasos…"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Registrar visita"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {visits.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-indigo-800">
              Todavía no hay visitas. Registra la primera consulta con el médico.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              hidePatient={Boolean(patientId)}
              readOnly={isReadOnly}
              onPatch={patchVisit}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VisitCard({
  visit,
  hidePatient,
  readOnly,
  onPatch,
}: {
  visit: VisitRow;
  hidePatient: boolean;
  readOnly: boolean;
  onPatch: (id: string, body: Record<string, string>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(visit.notes);
  const [savingNote, setSavingNote] = useState(false);

  const patient = firstRel(visit.patients);
  const protocol = firstRel(visit.protocols);
  const initials = patient
    ? toPatientInitials(patient.first_name, patient.last_name)
    : "?. ?.";

  async function saveNote() {
    setSavingNote(true);
    await onPatch(visit.id, { notes: draft });
    setSavingNote(false);
    setEditing(false);
  }

  return (
    <li>
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-950">
                {hidePatient ? kindLabel(visit.kind) : `${initials} · ${kindLabel(visit.kind)}`}
                {protocol ? ` · ${protocol.code_name}` : ""}
              </p>
              <p className="text-xs text-indigo-700">
                {new Date(visit.scheduled_at).toLocaleString("es")}
                {visit.clinician_name ? ` · ${visit.clinician_name}` : ""}
                {visit.location ? ` · ${visit.location}` : ""} ·{" "}
                {VISIT_STATUS_LABEL[visit.status] ?? visit.status}
              </p>
            </div>
            {readOnly || visit.status !== "scheduled" ? null : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void onPatch(visit.id, { status: "completed" })}
                >
                  Hecha
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void onPatch(visit.id, { status: "no_show" })}
                >
                  No asistió
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void onPatch(visit.id, { status: "cancelled" })}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <TextArea
                label="Nota clínica"
                value={draft}
                maxLength={VISIT_NOTES_MAX}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveNote()} disabled={savingNote}>
                  {savingNote ? "Guardando…" : "Guardar nota"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(visit.notes);
                    setEditing(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {visit.notes.trim() ? (
                <p className="whitespace-pre-wrap text-sm text-indigo-900">{visit.notes}</p>
              ) : (
                <p className="text-sm text-slate-500">Sin nota clínica todavía.</p>
              )}
              {readOnly ? null : (
                <Button
                  variant="ghost"
                  className="mt-1 px-0"
                  onClick={() => {
                    setDraft(visit.notes);
                    setEditing(true);
                  }}
                >
                  {visit.notes.trim() ? "Editar nota" : "Escribir nota"}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </li>
  );
}

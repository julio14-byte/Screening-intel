"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { VisitConflictError, type NewVisitInput } from "@/hooks/useVisits";
import {
  VISIT_KIND_LABEL,
  VISIT_KINDS,
  VISIT_NOTES_MAX,
  type VisitKind,
} from "@/lib/ops/model";
import {
  addDays,
  dayKey,
  findConflicts,
  formatTime,
  nextSlot,
  type VisitRow,
} from "@/lib/ops/visits";
import { normalizeTerm } from "@/lib/utils";
import type { Patient, Protocol } from "@/lib/types";

const DEFAULTS_KEY = "crisvia.citas.defaults";

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

type SavedDefaults = { location: string; clinician: string; kind: VisitKind };

function readDefaults(): SavedDefaults {
  if (typeof window === "undefined") {
    return { location: "", clinician: "", kind: "consulta" };
  }
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<SavedDefaults>;
    return {
      location: typeof parsed.location === "string" ? parsed.location : "",
      clinician: typeof parsed.clinician === "string" ? parsed.clinician : "",
      kind: VISIT_KINDS.includes(parsed.kind as VisitKind)
        ? (parsed.kind as VisitKind)
        : "consulta",
    };
  } catch {
    return { location: "", clinician: "", kind: "consulta" };
  }
}

function patientName(patient: Patient): string {
  return `${patient.last_name}, ${patient.first_name}`;
}

function slotFor(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = date.getMinutes() < 30 ? "00" : "30";
  return TIME_SLOTS.includes(`${h}:${m}`) ? `${h}:${m}` : "09:00";
}

export function NewVisitModal({
  open,
  onClose,
  patients,
  protocols,
  visits,
  lockedPatientId,
  presetDate,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  protocols: Protocol[];
  visits: VisitRow[];
  lockedPatientId?: string;
  presetDate?: string;
  onCreate: (input: NewVisitInput) => Promise<void>;
}) {
  const [patientId, setPatientId] = useState(lockedPatientId ?? "");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [kind, setKind] = useState<VisitKind>("consulta");
  const [protocolId, setProtocolId] = useState("");
  const [location, setLocation] = useState("");
  const [clinician, setClinician] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverConflict, setServerConflict] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = readDefaults();
    const slot = nextSlot();
    setPatientId(lockedPatientId ?? "");
    setQuery("");
    setDate(presetDate ?? dayKey(slot));
    setTime(slotFor(slot));
    setKind(defaults.kind);
    setLocation(defaults.location);
    setClinician(defaults.clinician);
    setProtocolId("");
    setNotes("");
    setError(null);
    setServerConflict(false);
  }, [open, lockedPatientId, presetDate]);

  const selected = patients.find((p) => p.id === patientId) ?? null;

  const matches = useMemo(() => {
    const term = normalizeTerm(query);
    if (!term) return patients.slice(0, 6);
    return patients
      .filter((p) =>
        normalizeTerm(
          `${p.first_name} ${p.last_name} ${p.subject_code ?? ""}`
        ).includes(term)
      )
      .slice(0, 6);
  }, [patients, query]);

  const at = useMemo(() => {
    if (!date || !time) return null;
    const value = new Date(`${date}T${time}:00`);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [date, time]);

  const conflicts = useMemo(
    () =>
      at && patientId
        ? findConflicts(visits, { patientId, at, location, clinician })
        : { patient: null, resource: null },
    [visits, at, patientId, location, clinician]
  );

  const quickDays = [
    { label: "Hoy", date: dayKey(new Date()) },
    { label: "Mañana", date: dayKey(addDays(new Date(), 1)) },
    { label: "En 1 semana", date: dayKey(addDays(new Date(), 7)) },
    { label: "En 2 semanas", date: dayKey(addDays(new Date(), 14)) },
  ];

  async function submit(event: FormEvent, force = false) {
    event.preventDefault();
    if (!patientId || !at) {
      setError("Elige un paciente y una fecha.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        patient_id: patientId,
        protocol_id: protocolId || null,
        scheduled_at: at.toISOString(),
        location,
        clinician_name: clinician,
        kind,
        notes,
        force,
      });
      try {
        window.localStorage.setItem(
          DEFAULTS_KEY,
          JSON.stringify({ location, clinician, kind })
        );
      } catch {
        // almacenamiento no disponible: se ignora, solo son preferencias.
      }
      onClose();
    } catch (err) {
      if (err instanceof VisitConflictError) {
        setServerConflict(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo agendar la cita.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agendar cita" wide>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-700">Paciente</span>
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-violet-200 bg-violet-50 px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-indigo-950">
                  {patientName(selected)}
                </p>
                <p className="text-xs text-indigo-700">
                  {selected.subject_code ? `Sujeto ${selected.subject_code}` : "Sin código de sujeto"}
                  {selected.phone ? ` · ${selected.phone}` : " · sin teléfono"}
                </p>
              </div>
              {lockedPatientId ? null : (
                <button
                  type="button"
                  aria-label="Cambiar paciente"
                  className="rounded p-1 text-indigo-700 hover:bg-violet-100"
                  onClick={() => setPatientId("")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-violet-400"
                  aria-hidden
                />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o código de sujeto…"
                  className="pl-8"
                  autoFocus
                  aria-label="Buscar paciente"
                />
              </div>
              <ul className="max-h-44 divide-y divide-violet-100 overflow-y-auto rounded-md border border-violet-100">
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-500">
                    Sin resultados. Registra al paciente primero en Registro.
                  </li>
                ) : (
                  matches.map((patient) => (
                    <li key={patient.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-violet-50"
                        onClick={() => setPatientId(patient.id)}
                      >
                        <span className="truncate text-indigo-950">
                          {patientName(patient)}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {patient.subject_code ?? ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {quickDays.map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => setDate(quick.date)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  date === quick.date
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-violet-200 bg-white text-indigo-800 hover:bg-violet-50"
                }`}
              >
                {quick.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <SelectInput
              label="Hora"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Tipo de cita"
            value={kind}
            onChange={(e) => setKind(e.target.value as VisitKind)}
          >
            {VISIT_KINDS.map((value) => (
              <option key={value} value={value}>
                {VISIT_KIND_LABEL[value]}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            label="Protocolo (opcional)"
            value={protocolId}
            onChange={(e) => setProtocolId(e.target.value)}
          >
            <option value="">Sin protocolo</option>
            {protocols.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.code_name}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Médico / investigador"
            value={clinician}
            onChange={(e) => setClinician(e.target.value)}
            placeholder="Dra. Pérez"
            maxLength={120}
          />
          <TextInput
            label="Sede o consultorio"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Consultorio 2"
            maxLength={120}
          />
        </div>

        <TextArea
          label="Nota para la cita (opcional)"
          value={notes}
          maxLength={VISIT_NOTES_MAX}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej. venir en ayunas, traer estudios previos…"
        />

        {conflicts.patient ? (
          <ConflictNotice>
            Este paciente ya tiene una cita programada a las{" "}
            {formatTime(conflicts.patient.scheduled_at)} ese día.
          </ConflictNotice>
        ) : null}
        {conflicts.resource ? (
          <ConflictNotice>
            {conflicts.resource.location || conflicts.resource.clinician_name} ya está
            ocupado a las {formatTime(conflicts.resource.scheduled_at)}.
          </ConflictNotice>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {serverConflict ? (
            <Button
              variant="secondary"
              disabled={saving}
              onClick={(e) => void submit(e, true)}
            >
              Agendar de todos modos
            </Button>
          ) : null}
          <Button type="submit" disabled={saving || !patientId}>
            {saving ? "Guardando…" : "Agendar cita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ConflictNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function RescheduleModal({
  visit,
  onClose,
  onSave,
}: {
  visit: VisitRow | null;
  onClose: () => void;
  onSave: (id: string, scheduledAt: string) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visit) return;
    const current = new Date(visit.scheduled_at);
    setDate(dayKey(current));
    setTime(slotFor(current));
    setError(null);
  }, [visit]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!visit) return;
    const value = new Date(`${date}T${time}:00`);
    if (Number.isNaN(value.getTime())) {
      setError("Fecha inválida.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(visit.id, value.toISOString());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reprogramar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={visit !== null} onClose={onClose} title="Reprogramar cita">
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Nueva fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <SelectInput
            label="Nueva hora"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </SelectInput>
        </div>
        {error ? (
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Reprogramar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import {
  VISIT_KIND_LABEL,
  type VisitKind,
  type VisitStatus,
} from "@/lib/ops/model";
import { firstEmbedded } from "@/lib/supabase/embed";

export type VisitPatient = {
  first_name: string;
  last_name: string;
  subject_code: string | null;
  phone: string | null;
  email: string | null;
};

export type VisitRow = {
  id: string;
  patient_id: string;
  protocol_id: string | null;
  scheduled_at: string;
  location: string;
  status: VisitStatus;
  notes: string;
  kind: VisitKind | string;
  clinician_name: string;
  patient: VisitPatient | null;
  protocol_code: string | null;
};

type RawVisit = Omit<VisitRow, "patient" | "protocol_code"> & {
  patients: unknown;
  protocols: unknown;
};

export function normalizeVisit(raw: RawVisit): VisitRow {
  const { patients, protocols, ...rest } = raw;
  const protocol = firstEmbedded(
    protocols as { code_name: string } | { code_name: string }[] | null
  );
  return {
    ...rest,
    patient: firstEmbedded(
      patients as VisitPatient | VisitPatient[] | null
    ),
    protocol_code: protocol?.code_name ?? null,
  };
}

export function kindLabel(kind: string): string {
  return VISIT_KIND_LABEL[kind as VisitKind] ?? kind;
}

export function patientLabel(patient: VisitPatient | null): string {
  if (!patient) return "Paciente";
  return `${patient.last_name}, ${patient.first_name}`;
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayHeading(key: string, now = new Date()): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = startOfDay(now);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const label = date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  if (diff === 0) return `Hoy · ${label}`;
  if (diff === 1) return `Mañana · ${label}`;
  if (diff === -1) return `Ayer · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupByDay(visits: VisitRow[]): [string, VisitRow[]][] {
  const map = new Map<string, VisitRow[]>();
  for (const visit of visits) {
    const key = dayKey(new Date(visit.scheduled_at));
    const bucket = map.get(key);
    if (bucket) bucket.push(visit);
    else map.set(key, [visit]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInputValue(date: Date): string {
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function nextSlot(from = new Date()): Date {
  const slot = new Date(from);
  slot.setSeconds(0, 0);
  const minutes = slot.getMinutes();
  slot.setMinutes(minutes < 30 ? 30 : 60);
  return slot;
}

export const VISIT_CONFLICT_WINDOW_MS = 60 * 60 * 1000;

export function findConflicts(
  visits: VisitRow[],
  candidate: { patientId: string; at: Date; location: string; clinician: string }
): { patient: VisitRow | null; resource: VisitRow | null } {
  const at = candidate.at.getTime();
  const near = visits.filter(
    (visit) =>
      visit.status === "scheduled" &&
      Math.abs(new Date(visit.scheduled_at).getTime() - at) <
        VISIT_CONFLICT_WINDOW_MS
  );
  const location = candidate.location.trim().toLowerCase();
  const clinician = candidate.clinician.trim().toLowerCase();
  return {
    patient: near.find((v) => v.patient_id === candidate.patientId) ?? null,
    resource:
      near.find(
        (v) =>
          v.patient_id !== candidate.patientId &&
          ((location && v.location.trim().toLowerCase() === location) ||
            (clinician && v.clinician_name.trim().toLowerCase() === clinician))
      ) ?? null,
  };
}

export function isOverdue(visit: VisitRow, now = new Date()): boolean {
  return (
    visit.status === "scheduled" &&
    new Date(visit.scheduled_at).getTime() < now.getTime() - 60 * 60 * 1000
  );
}

/** Solo dígitos; asume México (+52) si vienen 10 dígitos. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function reminderMessage(visit: VisitRow): string {
  const first = visit.patient?.first_name?.trim() || "";
  const when = new Date(visit.scheduled_at).toLocaleString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const where = visit.location ? ` en ${visit.location}` : "";
  const greeting = first ? `Hola ${first}` : "Hola";
  return `${greeting}, te recordamos tu cita de ${kindLabel(
    visit.kind
  ).toLowerCase()} el ${when}${where}. ¿Nos confirmas tu asistencia? Gracias. — Equipo de investigación clínica`;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function smsUrl(phone: string, message: string): string {
  return `sms:+${phone}?body=${encodeURIComponent(message)}`;
}

export function mailtoUrl(email: string, message: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(
    "Recordatorio de cita"
  )}&body=${encodeURIComponent(message)}`;
}

export function visitStatusTone(status: VisitStatus, overdue: boolean): string {
  if (overdue) return "bg-amber-100 text-amber-900 ring-amber-200";
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    case "no_show":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    default:
      return "bg-violet-100 text-violet-900 ring-violet-200";
  }
}

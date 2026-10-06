"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Mail, MessageCircle, Phone, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { VISIT_NOTES_MAX, VISIT_STATUS_LABEL } from "@/lib/ops/model";
import {
  formatTime,
  isOverdue,
  kindLabel,
  mailtoUrl,
  patientLabel,
  phoneDigits,
  reminderMessage,
  smsUrl,
  visitStatusTone,
  whatsappUrl,
  type VisitRow,
} from "@/lib/ops/visits";

const contactLink =
  "inline-flex items-center gap-1 rounded-md border border-violet-200 bg-white px-2 py-1 text-xs font-medium text-indigo-800 hover:bg-violet-50";

export function VisitCard({
  visit,
  hidePatient,
  readOnly,
  showDate,
  onPatch,
  onReschedule,
}: {
  visit: VisitRow;
  hidePatient?: boolean;
  readOnly: boolean;
  showDate?: boolean;
  onPatch: (id: string, body: Record<string, string>) => Promise<void>;
  onReschedule: (visit: VisitRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(visit.notes);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const overdue = isOverdue(visit);
  const phone = phoneDigits(visit.patient?.phone);
  const email = visit.patient?.email?.trim() || null;
  const message = reminderMessage(visit);
  const canContact = visit.status === "scheduled";

  async function run(body: Record<string, string>) {
    setBusy(true);
    setActionError(null);
    try {
      await onPatch(visit.id, body);
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo actualizar.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (await run({ notes: draft })) setEditing(false);
  }

  return (
    <li className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="w-14 shrink-0 text-center">
            <p className="text-lg font-semibold leading-none text-indigo-950">
              {formatTime(visit.scheduled_at)}
            </p>
            {showDate ? (
              <p className="mt-1 text-[11px] text-slate-500">
                {new Date(visit.scheduled_at).toLocaleDateString("es", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-950">
              {hidePatient ? (
                kindLabel(visit.kind)
              ) : (
                <Link
                  href={`/patients/${visit.patient_id}`}
                  className="hover:text-violet-700 hover:underline"
                >
                  {patientLabel(visit.patient)}
                </Link>
              )}
            </p>
            <p className="text-xs text-indigo-700">
              {hidePatient ? null : `${kindLabel(visit.kind)}`}
              {visit.protocol_code ? `${hidePatient ? "" : " · "}${visit.protocol_code}` : ""}
              {visit.clinician_name ? ` · ${visit.clinician_name}` : ""}
              {visit.location ? ` · ${visit.location}` : ""}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${visitStatusTone(
            visit.status,
            overdue
          )}`}
        >
          {overdue ? "Por cerrar" : (VISIT_STATUS_LABEL[visit.status] ?? visit.status)}
        </span>
      </div>

      {canContact ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Recordar
          </span>
          {phone ? (
            <>
              <a
                className={contactLink}
                href={whatsappUrl(phone, message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
              </a>
              <a className={contactLink} href={smsUrl(phone, message)}>
                <Smartphone className="h-3.5 w-3.5" aria-hidden /> SMS
              </a>
              <a className={contactLink} href={`tel:+${phone}`}>
                <Phone className="h-3.5 w-3.5" aria-hidden /> Llamar
              </a>
            </>
          ) : null}
          {email ? (
            <a className={contactLink} href={mailtoUrl(email, message)}>
              <Mail className="h-3.5 w-3.5" aria-hidden /> Correo
            </a>
          ) : null}
          {!phone && !email ? (
            <span className="text-xs text-slate-500">
              Sin teléfono ni correo en el registro.
            </span>
          ) : null}
        </div>
      ) : null}

      {readOnly || visit.status !== "scheduled" ? null : (
        <div className="mt-3 flex flex-wrap gap-2 [&_button]:py-1 [&_button]:text-xs">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void run({ status: "completed" })}
          >
            Marcar hecha
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => onReschedule(visit)}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Reprogramar
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void run({ status: "no_show" })}
          >
            No asistió
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("¿Cancelar esta cita?")) void run({ status: "cancelled" });
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {actionError ? (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {actionError}
        </p>
      ) : null}

      <div className="mt-3 border-t border-violet-50 pt-2">
        {editing ? (
          <div className="space-y-2">
            <TextArea
              label="Nota"
              value={draft}
              maxLength={VISIT_NOTES_MAX}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void saveNote()}>
                {busy ? "Guardando…" : "Guardar nota"}
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
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={`whitespace-pre-wrap text-sm ${
                visit.notes.trim() ? "text-indigo-900" : "text-slate-400"
              }`}
            >
              {visit.notes.trim() || "Sin nota."}
            </p>
            {readOnly ? null : (
              <button
                type="button"
                className="text-xs font-medium text-violet-700 hover:underline"
                onClick={() => {
                  setDraft(visit.notes);
                  setEditing(true);
                }}
              >
                {visit.notes.trim() ? "Editar nota" : "Agregar nota"}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

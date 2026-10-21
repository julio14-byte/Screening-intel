"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import {
  CHANNEL_LABELS,
  CONTACT_CHANNELS,
  CONTACT_OUTCOMES,
  OUTCOME_LABELS,
  type ContactAttempt,
  type ContactChannel,
  type ContactOutcome,
} from "@/lib/candidato/contact-log";

const selectClass =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

export function ContactLogPanel({
  submissionId,
  attempts,
  canWrite,
  onSaved,
}: {
  submissionId: string;
  attempts: ContactAttempt[];
  canWrite: boolean;
  onSaved: (attempt: ContactAttempt) => void;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ContactChannel>("phone");
  const [outcome, setOutcome] = useState<ContactOutcome>("no_answer");
  const [notes, setNotes] = useState("");
  const [nextOn, setNextOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = attempts
    .slice()
    .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/candidatos/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          channel,
          outcome,
          notes: notes.trim() || null,
          next_attempt_on: nextOn || null,
        }),
      });
      const json = await readJsonResponse<{ attempt?: ContactAttempt; error?: string }>(res);
      if (!res.ok || !json?.attempt) throw new Error(json?.error ?? "No se pudo registrar.");
      onSaved(json.attempt);
      setNotes("");
      setNextOn("");
      setOpen(false);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo registrar el contacto."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-violet-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-indigo-900">
          Bitácora de contacto ({history.length})
        </p>
        {canWrite && !open ? (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Registrar contacto
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-3 rounded-md bg-violet-50/60 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              Canal
              <select
                className={selectClass}
                value={channel}
                onChange={(e) => setChannel(e.target.value as ContactChannel)}
              >
                {CONTACT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              Resultado
              <select
                className={selectClass}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as ContactOutcome)}
              >
                {CONTACT_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {OUTCOME_LABELS[o]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextInput
              label="Próximo intento"
              type="date"
              value={nextOn}
              onChange={(e) => setNextOn(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextInput
                label="Notas (sin datos clínicos innecesarios)"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          {error ? <ErrorState message={error} /> : null}
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {history.slice(0, 5).map((a) => (
            <li key={a.id}>
              <span className="tabular-nums text-slate-500">{fmt(a.attempted_at)}</span>
              {" · "}
              {CHANNEL_LABELS[a.channel]} · {OUTCOME_LABELS[a.outcome]}
              {a.next_attempt_on ? ` · reintentar ${a.next_attempt_on}` : ""}
              {a.notes ? ` — ${a.notes}` : ""}
            </li>
          ))}
          {history.length > 5 ? (
            <li className="text-slate-400">y {history.length - 5} intentos anteriores</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Aún sin intentos de contacto.</p>
      )}
    </div>
  );
}

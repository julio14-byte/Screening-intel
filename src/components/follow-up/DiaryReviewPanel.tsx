"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { toErrorMessage } from "@/lib/errors";
import {
  DIARY_SOURCES,
  DIARY_SOURCE_LABELS,
  compliancePct,
  diaryFlags,
  periodDays,
  type DiaryInput,
  type DiaryReview,
  type DiarySource,
  type VisitForDiary,
} from "@/lib/diary/review";

export interface DiaryVisit extends VisitForDiary {
  protocol_id: string;
  baseline_on: string;
}

export function DiaryReviewSummary({
  review,
  visit,
  patientId,
}: {
  review: DiaryReview;
  visit: VisitForDiary;
  patientId: string;
}) {
  const flags = diaryFlags(review, visit);
  return (
    <div className="mt-2 rounded-md bg-violet-50/60 px-3 py-2 text-xs text-slate-700">
      <p className="font-semibold text-indigo-950">
        Diario revisado · {review.completed_days}/{review.expected_days} días (
        {compliancePct(review)}%) · {review.period_start} → {review.period_end}
      </p>
      <p>
        {DIARY_SOURCE_LABELS[review.source_system]} · {review.source_ref} · dosis omitidas{" "}
        {review.missed_doses} · {review.reviewer_role ?? "sin rol"} ·{" "}
        {review.reviewed_at.slice(0, 10)}
      </p>
      {flags.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-800">
          {flags.map((flag) => (
            <li key={flag.kind}>{flag.label}</li>
          ))}
        </ul>
      ) : null}
      {review.ae_note ? <p className="mt-1">Posible EA: {review.ae_note}</p> : null}
      {review.new_medications_note ? (
        <p className="mt-1">
          Medicación nueva: {review.new_medications_note}{" "}
          <Link
            className="font-medium text-violet-700 underline"
            href={`/protocols/${review.protocol_id}/revision/${patientId}`}
          >
            Conciliar en la revisión de expediente
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function DiaryReviewForm({
  patientId,
  visit,
  suggested,
  onSave,
  onClose,
}: {
  patientId: string;
  visit: DiaryVisit;
  suggested: { start: string; end: string } | null;
  onSave: (input: DiaryInput) => Promise<void>;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [source, setSource] = useState<DiarySource>("veeva");
  const [sourceRef, setSourceRef] = useState("");
  const [start, setStart] = useState(suggested?.start ?? "");
  const [end, setEnd] = useState(suggested?.end ?? visit.actual_on ?? today);
  const [expected, setExpected] = useState(() =>
    suggested ? String(Math.min(366, Math.max(1, periodDays(suggested.start, suggested.end)))) : ""
  );
  const [completed, setCompleted] = useState("");
  const [missed, setMissed] = useState("0");
  const [ae, setAe] = useState(false);
  const [aeNote, setAeNote] = useState("");
  const [meds, setMeds] = useState(false);
  const [medsNote, setMedsNote] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        patient_id: patientId,
        protocol_id: visit.protocol_id,
        visit_id: visit.id,
        source_system: source,
        source_ref: sourceRef,
        period_start: start,
        period_end: end,
        expected_days: Number(expected),
        completed_days: Number(completed),
        missed_doses: Number(missed) || 0,
        possible_ae: ae,
        ae_note: ae ? aeNote : null,
        new_medications: meds,
        new_medications_note: meds ? medsNote : null,
        note: note || null,
      });
      onClose();
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo registrar la revisión del diario."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-3 grid gap-2 sm:grid-cols-4">
      <p className="text-xs text-slate-600 sm:col-span-4">
        El diario vive en el sistema del patrocinador. Aquí solo registras lo que revisaste con el
        paciente en esta visita; no se copian las entradas del diario.
      </p>
      <SelectInput
        label="Sistema del diario"
        value={source}
        onChange={(e) => setSource(e.target.value as DiarySource)}
      >
        {DIARY_SOURCES.map((s) => (
          <option key={s} value={s}>
            {DIARY_SOURCE_LABELS[s]}
          </option>
        ))}
      </SelectInput>
      <div className="sm:col-span-3">
        <TextInput
          label="Referencia de la fuente"
          placeholder="Sujeto, periodo o folio en el sistema"
          value={sourceRef}
          maxLength={200}
          onChange={(e) => setSourceRef(e.target.value)}
          required
        />
      </div>
      <TextInput label="Inicio del periodo" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      <TextInput label="Fin del periodo" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
      <TextInput label="Días esperados" type="number" min={1} max={366} value={expected} onChange={(e) => setExpected(e.target.value)} required />
      <TextInput label="Días completados" type="number" min={0} max={366} value={completed} onChange={(e) => setCompleted(e.target.value)} required />
      <TextInput label="Dosis omitidas" type="number" min={0} value={missed} onChange={(e) => setMissed(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-indigo-950 sm:col-span-4">
        <input type="checkbox" checked={ae} onChange={(e) => setAe(e.target.checked)} />
        El paciente reporta un posible evento adverso
      </label>
      {ae ? (
        <div className="sm:col-span-4">
          <TextArea label="Describe el posible evento adverso" value={aeNote} maxLength={500} onChange={(e) => setAeNote(e.target.value)} required />
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-indigo-950 sm:col-span-4">
        <input type="checkbox" checked={meds} onChange={(e) => setMeds(e.target.checked)} />
        El paciente reporta medicación nueva
      </label>
      {meds ? (
        <div className="sm:col-span-4">
          <TextArea label="Medicación nueva" value={medsNote} maxLength={500} onChange={(e) => setMedsNote(e.target.value)} required />
        </div>
      ) : null}
      <div className="sm:col-span-4">
        <TextArea label="Nota (opcional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error ? <p className="text-xs text-red-700 sm:col-span-4">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Registrar revisión del diario"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { toErrorMessage } from "@/lib/errors";
import {
  DECISION_LABELS,
  REVIEW_DECISIONS,
  SOURCE_LABELS,
  SOURCE_TYPES,
  STATE_LABELS,
  type ReviewDecision,
  type ReviewInput,
  type ReviewRow,
  type ReviewState,
  type SourceType,
} from "@/lib/chart-review/review";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<ReviewState, string> = {
  unreviewed: "bg-slate-100 text-slate-700",
  confirmed: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-800",
  clarify: "bg-amber-50 text-amber-900",
  stale: "bg-amber-50 text-amber-900",
  outdated: "bg-amber-50 text-amber-900",
  discrepancy: "bg-rose-50 text-rose-800",
};

const selectClass =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

const ENGINE_ICON = {
  pass: <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />,
  fail: <CircleX className="h-3.5 w-3.5 text-rose-500" aria-hidden />,
  missing: <CircleAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden />,
} as const;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function CriterionReviewRow({
  row,
  patientId,
  protocolId,
  canWrite,
  onSubmit,
}: {
  row: ReviewRow;
  patientId: string;
  protocolId: string;
  canWrite: boolean;
  onSubmit: (input: ReviewInput) => Promise<void>;
}) {
  const { detail, review } = row;
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<ReviewDecision>("confirmed");
  const [sourceType, setSourceType] = useState<SourceType>("visit_note");
  const [sourceRef, setSourceRef] = useState("");
  const [observedOn, setObservedOn] = useState(todayIso());
  const [sourceValue, setSourceValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        patient_id: patientId,
        protocol_id: protocolId,
        criterion: detail.criterion,
        criterion_type: detail.type,
        engine_status: detail.status,
        engine_evidence: (detail.evidence ?? []).slice(0, 10).map((e) => e.slice(0, 200)),
        decision,
        source_type: decision === "clarify" ? null : sourceType,
        source_ref: decision === "clarify" ? null : sourceRef.trim() || null,
        observed_on: decision === "clarify" ? null : observedOn || null,
        source_value: sourceValue.trim() || null,
        note: note.trim() || null,
      });
      setOpen(false);
      setSourceRef("");
      setSourceValue("");
      setNote("");
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo registrar la revisión."));
    } finally {
      setSaving(false);
    }
  };

  const evidence = detail.evidence ?? [];
  const needsSource = decision !== "clarify";

  return (
    <li className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-950">
            {ENGINE_ICON[detail.status]}
            {detail.criterion}
            <span
              className={cn(
                "rounded px-1 py-px text-[10px] font-semibold uppercase",
                detail.type === "inclusion"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {detail.type === "inclusion" ? "Inclusión" : "Exclusión"}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-700">{detail.detail}</p>
          {evidence.length > 0 ? (
            <p className="mt-0.5 text-[11px] text-slate-600">
              En el sistema:{" "}
              {evidence.map((item, i) => (
                <span key={`${item}-${i}`}>
                  {i > 0 ? " · " : null}
                  <q>{item}</q>
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-amber-800">Sin evidencia en el sistema.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              STATE_STYLE[row.state]
            )}
          >
            {STATE_LABELS[row.state]}
          </span>
          {canWrite && !open ? (
            <Button variant="secondary" className="print:hidden" onClick={() => setOpen(true)}>
              {review ? "Revisar de nuevo" : "Revisar"}
            </Button>
          ) : null}
        </div>
      </div>

      {row.flag ? (
        <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
          {row.flag}
        </p>
      ) : null}

      {review ? (
        <p className="mt-1.5 text-[11px] text-slate-600">
          {DECISION_LABELS[review.decision]}
          {review.source_type ? ` · ${SOURCE_LABELS[review.source_type]}` : ""}
          {review.source_ref ? ` “${review.source_ref}”` : ""}
          {review.observed_on ? ` · dato del ${review.observed_on}` : ""}
          {review.source_value ? ` · fuente: ${review.source_value}` : ""}
          {review.note ? ` — ${review.note}` : ""}
          <span className="text-slate-400">
            {" "}
            · {review.reviewer_role ?? "revisor"}, {review.reviewed_at.slice(0, 10)}
            {row.reviewCount > 1 ? ` · ${row.reviewCount} revisiones` : ""}
          </span>
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3 rounded-md bg-violet-50/60 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-3">
              Decisión
              <select
                className={selectClass}
                value={decision}
                onChange={(e) => setDecision(e.target.value as ReviewDecision)}
              >
                {REVIEW_DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {DECISION_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
            {needsSource ? (
              <>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Fuente
                  <select
                    className={selectClass}
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                  >
                    {SOURCE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput
                  label="Documento o referencia"
                  maxLength={200}
                  placeholder="Folio, nombre del archivo o fecha de la nota"
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                />
                <TextInput
                  label="Fecha del dato en la fuente"
                  type="date"
                  value={observedOn}
                  onChange={(e) => setObservedOn(e.target.value)}
                />
                <TextInput
                  label="Valor en la fuente (opcional)"
                  maxLength={60}
                  placeholder="Para comparar con el sistema"
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                />
              </>
            ) : null}
            <div className="sm:col-span-3">
              <TextInput
                label={needsSource ? "Nota (opcional)" : "Qué falta aclarar"}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          {error ? <ErrorState message={error} /> : null}
          <div className="flex gap-2">
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Guardando…" : "Registrar revisión"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { useEnrollmentTargets } from "@/hooks/useEnrollmentTargets";
import { useProtocols } from "@/hooks/useProtocols";
import { toErrorMessage } from "@/lib/errors";
import {
  buildEnrollmentProgress,
  isPaceAlert,
  PACE_LABELS,
  type EnrollmentPace,
  type EnrollmentProgress,
  type EnrollmentTarget,
} from "@/lib/enrollment/targets";
import { cn } from "@/lib/utils";
import type { ScreeningWithRelations } from "@/lib/types";

const PACE_STYLE: Record<EnrollmentPace, string> = {
  complete: "bg-emerald-50 text-emerald-800",
  on_track: "bg-emerald-50 text-emerald-800",
  behind: "bg-amber-50 text-amber-900",
  at_risk: "bg-rose-50 text-rose-800",
  overdue: "bg-rose-50 text-rose-800",
  not_started: "bg-slate-100 text-slate-700",
  no_window: "bg-slate-100 text-slate-700",
};

const BAR_STYLE: Record<EnrollmentPace, string> = {
  complete: "bg-emerald-500",
  on_track: "bg-emerald-500",
  behind: "bg-amber-500",
  at_risk: "bg-rose-500",
  overdue: "bg-rose-500",
  not_started: "bg-slate-400",
  no_window: "bg-violet-500",
};

type Draft = { target: string; start: string; end: string };

function TargetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Draft;
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo guardar la meta."));
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-md bg-violet-50/60 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput
          label="Meta de randomizados"
          type="number"
          min={1}
          value={draft.target}
          onChange={(e) => setDraft({ ...draft, target: e.target.value })}
        />
        <TextInput
          label="Inicio de reclutamiento"
          type="date"
          value={draft.start}
          onChange={(e) => setDraft({ ...draft, start: e.target.value })}
        />
        <TextInput
          label="Cierre de reclutamiento"
          type="date"
          value={draft.end}
          onChange={(e) => setDraft({ ...draft, end: e.target.value })}
        />
      </div>
      {error ? <ErrorState message={error} /> : null}
      <div className="flex gap-2">
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? "Guardando…" : "Guardar meta"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function ProgressDetail({ p }: { p: EnrollmentProgress }) {
  const lines: string[] = [];
  if (p.pace === "complete") {
    lines.push("Se alcanzó la meta de randomizados.");
  } else {
    lines.push(`Faltan ${p.remaining} randomizados.`);
    if (p.expectedByNow !== null) {
      lines.push(`A esta fecha se esperaban ${p.expectedByNow}.`);
    }
    if (p.daysLeft !== null && p.pace !== "overdue" && p.pace !== "not_started") {
      lines.push(`Quedan ${p.daysLeft} días de reclutamiento.`);
    }
    if (p.projectedFinish) {
      lines.push(`Al ritmo actual terminarías el ${p.projectedFinish}.`);
    }
    if (p.neededInScreening !== null && p.neededInScreening > 0) {
      lines.push(
        `Con ${Math.round((p.conversion ?? 0) * 100)}% de conversión, suma unos ${p.neededInScreening} sujetos más a screening.`
      );
    }
  }
  return <p className="mt-2 text-xs text-slate-600">{lines.join(" ")}</p>;
}

export function EnrollmentGoals({
  screenings,
}: {
  screenings: ScreeningWithRelations[];
}) {
  const { protocols } = useProtocols();
  const { targets, loading, error, save, remove } = useEnrollmentTargets();
  const { isReadOnly } = useRole();
  const [editing, setEditing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const active = useMemo(
    () => protocols.filter((p) => p.status === "active"),
    [protocols]
  );
  const progress = useMemo(
    () =>
      new Map(
        buildEnrollmentProgress(targets, screenings).map((p) => [p.protocolId, p])
      ),
    [targets, screenings]
  );
  const targetByProtocol = useMemo(
    () => new Map(targets.map((t) => [t.protocol_id, t])),
    [targets]
  );

  if (loading || active.length === 0) return null;

  const handleSave = async (protocolId: string, draft: Draft) => {
    const value: EnrollmentTarget = {
      protocol_id: protocolId,
      target_randomized: Number(draft.target),
      start_date: draft.start || null,
      end_date: draft.end || null,
    };
    await save(value);
    setEditing(null);
  };

  const handleRemove = async (protocolId: string) => {
    setActionError(null);
    try {
      await remove(protocolId);
    } catch (e) {
      setActionError(toErrorMessage(e, "No se pudo quitar la meta."));
    }
  };

  const alerts = [...progress.values()].filter((p) => isPaceAlert(p.pace)).length;

  return (
    <Card>
      <CardHeader
        title="Metas de enrolamiento"
        description={
          alerts > 0
            ? `${alerts} protocolo(s) requieren atención por ritmo de reclutamiento.`
            : "Avance de randomizados contra la meta de cada protocolo."
        }
      />
      <CardBody className="space-y-3">
        {error ? <ErrorState message={error} /> : null}
        {actionError ? <ErrorState message={actionError} /> : null}
        {active.map((protocol) => {
          const p = progress.get(protocol.id);
          const target = targetByProtocol.get(protocol.id);
          const formOpen = editing === protocol.id;
          return (
            <div
              key={protocol.id}
              className="rounded-lg border border-slate-200 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {protocol.code_name}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {protocol.title}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        PACE_STYLE[p.pace]
                      )}
                    >
                      {PACE_LABELS[p.pace]}
                    </span>
                  ) : null}
                  {!isReadOnly && !formOpen ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setEditing(protocol.id)}
                      >
                        {target ? "Editar" : "Definir meta"}
                      </Button>
                      {target ? (
                        <Button
                          variant="ghost"
                          onClick={() => void handleRemove(protocol.id)}
                        >
                          Quitar
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              {p ? (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={p.randomized}
                      aria-valuemin={0}
                      aria-valuemax={p.target}
                      aria-label={`Randomizados de ${protocol.code_name}`}
                    >
                      <div
                        className={cn("h-full rounded-full", BAR_STYLE[p.pace])}
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-slate-900">
                      {p.randomized} / {p.target}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {p.inScreening} en screening · {p.inPreScreening} en pre-screening ·{" "}
                    {p.screenFailures} screen failures
                  </p>
                  <ProgressDetail p={p} />
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Sin meta definida.</p>
              )}

              {formOpen ? (
                <TargetForm
                  initial={{
                    target: target ? String(target.target_randomized) : "",
                    start: target?.start_date ?? "",
                    end: target?.end_date ?? "",
                  }}
                  onSave={(draft) => handleSave(protocol.id, draft)}
                  onCancel={() => setEditing(null)}
                />
              ) : null}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

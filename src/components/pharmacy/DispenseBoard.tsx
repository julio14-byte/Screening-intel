"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { formatDeliveryDate } from "@/lib/pharmacy/delivery";
import { studySubjectCaption } from "@/lib/profile/demographics";

type Row = {
  id: string;
  patient_id: string;
  protocol_id: string;
  delivered_on: string | null;
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
};

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function DispenseBoard() {
  const { isReadOnly } = useRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pharmacy/dispense");
    const json = await readJsonResponse<{ rows?: Row[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar dispensación.");
    setRows(json?.rows ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error de dispensación.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function save(row: Row, deliveredOn: string | null) {
    setWorkingId(row.id);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: row.patient_id,
          protocol_id: row.protocol_id,
          delivered_on: deliveredOn,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar la fecha.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la fecha.");
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando dispensación…" />;

  const pending = rows.filter((row) => !row.delivered_on);
  const delivered = rows.filter((row) => row.delivered_on);

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader
          title="Sin fecha de entrega"
          actions={<Pill className="h-4 w-4 text-teal-600" aria-hidden />}
        />
        <CardBody>
          {pending.length === 0 ? (
            <EmptyState
              title="Sin entregas pendientes"
              action={
                <Link href="/tracker" className="text-xs font-medium text-sky-700">
                  Ir al Tracker →
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-violet-50">
              {pending.map((row) => (
                <DeliveryRow
                  key={row.id}
                  row={row}
                  draft={drafts[row.id] ?? localToday()}
                  readOnly={isReadOnly}
                  busy={workingId === row.id}
                  onDraft={(value) =>
                    setDrafts((current) => ({ ...current, [row.id]: value }))
                  }
                  onSave={(value) => save(row, value)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Entregado"
        />
        <CardBody>
          {delivered.length === 0 ? (
            <p className="text-sm text-slate-500">Sin entregas.</p>
          ) : (
            <ul className="divide-y divide-violet-50">
              {delivered.map((row) => (
                <DeliveryRow
                  key={row.id}
                  row={row}
                  draft={drafts[row.id] ?? row.delivered_on ?? localToday()}
                  readOnly={isReadOnly}
                  busy={workingId === row.id}
                  onDraft={(value) =>
                    setDrafts((current) => ({ ...current, [row.id]: value }))
                  }
                  onSave={(value) => save(row, value)}
                  onClear={() => save(row, null)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DeliveryRow({
  row,
  draft,
  readOnly,
  busy,
  onDraft,
  onSave,
  onClear,
}: {
  row: Row;
  draft: string;
  readOnly: boolean;
  busy: boolean;
  onDraft: (value: string) => void;
  onSave: (value: string) => void;
  onClear?: () => void;
}) {
  const subject = studySubjectCaption({ subject_code: row.subject_code });
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-indigo-950">{row.patient_name}</p>
        <p className="text-xs text-slate-500">
          {row.protocol_code || "Protocolo"}
          {subject ? ` · ${subject}` : ""}
          {row.delivered_on ? ` · ${formatDeliveryDate(row.delivered_on)}` : ""}
        </p>
      </div>
      {readOnly ? null : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
          }}
        >
          <TextInput
            label="Fecha de entrega"
            type="date"
            required
            value={draft}
            max={localToday()}
            onChange={(event) => onDraft(event.target.value)}
          />
          <Button type="submit" disabled={busy || !draft}>
            {busy ? "Guardando…" : "Guardar fecha"}
          </Button>
          {onClear ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onClear()}
            >
              Quitar
            </Button>
          ) : null}
        </form>
      )}
    </li>
  );
}

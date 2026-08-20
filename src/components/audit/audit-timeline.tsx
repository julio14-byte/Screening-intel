"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import {
  formatAuditEntry,
  formatAuditTimestamp,
  formatAuditUser,
  formatValue,
} from "@/lib/audit/format-audit-entry";
import type { AuditAction, AuditLog } from "@/lib/audit/types";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/hooks/useAuditLogs";

const ACTION_STYLES: Record<
  AuditAction,
  { dot: string; badge: string; icon: typeof History }
> = {
  INSERT: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: ClipboardList,
  },
  UPDATE: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: History,
  },
  DELETE: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-red-200",
    icon: Trash2,
  },
  CUSTOM: {
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    icon: ShieldCheck,
  },
};

function JsonBlock({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);

  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        )}
        {title}
      </button>
      {open ? (
        <pre className="max-h-48 overflow-auto border-t border-slate-200 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function FieldDiffTable({
  changes,
}: {
  changes: ReturnType<typeof formatAuditEntry>["fieldChanges"];
}) {
  if (changes.length === 0) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Campo</th>
            <th className="px-3 py-2 font-medium">Antes</th>
            <th className="px-3 py-2 font-medium">Después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {changes.map((change) => (
            <tr key={change.field} className="align-top">
              <td className="px-3 py-2 font-mono text-slate-700">
                {change.field}
              </td>
              <td className="px-3 py-2 text-red-700/90">
                <span className="block max-w-[12rem] truncate font-mono">
                  {formatValue(change.before)}
                </span>
              </td>
              <td className="px-3 py-2 text-emerald-700/90">
                <span className="block max-w-[12rem] truncate font-mono">
                  {formatValue(change.after)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTimelineItem({ log }: { log: AuditLog }) {
  const entry = useMemo(() => formatAuditEntry(log), [log]);
  const styles = ACTION_STYLES[entry.action];
  const Icon = styles.icon;

  return (
    <li className="relative pl-8 pb-6 last:pb-0">
      <span
        className={cn(
          "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
          styles.dot
        )}
        aria-hidden
      />
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                  styles.badge
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {entry.actionLabel}
              </span>
              <span className="text-[11px] text-slate-500">
                {entry.tableLabel}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-800">{entry.summary}</p>
          </div>
          <time
            className="shrink-0 text-[11px] text-slate-500"
            dateTime={entry.createdAt}
            title="UTC"
          >
            {formatAuditTimestamp(entry.createdAt)} UTC
          </time>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {formatAuditUser(entry.userId)}
        </div>

        {entry.customPayload?.metadata &&
        Object.keys(entry.customPayload.metadata).length > 0 ? (
          <JsonBlock title="Metadatos del evento" data={entry.customPayload.metadata} />
        ) : null}

        <FieldDiffTable changes={entry.fieldChanges} />

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <JsonBlock title="Datos anteriores (JSON)" data={entry.rawOldData} />
          <JsonBlock title="Datos nuevos (JSON)" data={entry.rawNewData} />
        </div>
      </div>
    </li>
  );
}

export function AuditTimeline({
  tableName,
  recordId,
  title = "Bitácora de auditoría",
  description = "Registro inmutable de cambios (21 CFR Part 11). Solo lectura.",
  className,
}: {
  tableName: string;
  recordId: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  const { logs, loading, error } = useAuditLogs(tableName, recordId);

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        actions={<History className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        {loading ? (
          <LoadingState label="Cargando bitácora de auditoría…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : logs.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
            Sin registros de auditoría para este expediente. Los cambios en
            datos demográficos del paciente se registran automáticamente.
          </p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-1">
            {logs.map((log) => (
              <AuditTimelineItem key={log.id} log={log} />
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

export default AuditTimeline;

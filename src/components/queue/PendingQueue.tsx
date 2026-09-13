"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, FileWarning, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingState, EmptyState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { PendingItem, PendingKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  PendingKind,
  { label: string; icon: typeof FlaskConical; className: string }
> = {
  overdue_visit: {
    label: "Visitas vencidas",
    icon: CalendarClock,
    className: "bg-rose-50 text-rose-800",
  },
  missing_consent: {
    label: "Sin consentimiento",
    icon: FileWarning,
    className: "bg-amber-50 text-amber-900",
  },
  missing_criterion: {
    label: "Labs / criterios faltantes",
    icon: FlaskConical,
    className: "bg-violet-50 text-violet-900",
  },
};

export function PendingQueue() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PendingKind | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pendientes", { credentials: "include" });
      const data = await readJsonResponse<{ items?: PendingItem[]; error?: string }>(
        res
      );
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar la cola.");
      setItems(data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pendientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      overdue_visit: items.filter((i) => i.kind === "overdue_visit").length,
      missing_consent: items.filter((i) => i.kind === "missing_consent").length,
      missing_criterion: items.filter((i) => i.kind === "missing_criterion").length,
    };
  }, [items]);

  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter);

  if (loading) return <LoadingState label="Armando la cola de pendientes…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", `Todos (${counts.all})`],
            ["overdue_visit", `Visitas (${counts.overdue_visit})`],
            ["missing_consent", `ICF (${counts.missing_consent})`],
            ["missing_criterion", `Labs (${counts.missing_criterion})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              filter === value
                ? "bg-violet-600 text-white"
                : "bg-violet-50 text-violet-800 hover:bg-violet-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            title="Nada pendiente"
            description="No hay visitas vencidas, ICF faltantes ni criterios 🟡 en los screenings activos."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <Card key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 p-4 hover:bg-violet-50/50"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      meta.className
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {item.patientName}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {meta.label}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-800">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {item.protocolLabel ? `${item.protocolLabel} · ` : ""}
                      {item.detail}
                      {item.dueAt
                        ? ` · ${new Date(item.dueAt).toLocaleString("es-419")}`
                        : ""}
                    </span>
                  </span>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

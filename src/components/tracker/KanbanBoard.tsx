"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import type { ScreeningStatus, ScreeningWithRelations } from "@/lib/types";
import {
  cn,
  SCREENING_STATUS_LABELS,
  SCREENING_STATUS_ORDER,
} from "@/lib/utils";

const COLUMN_STYLES: Record<ScreeningStatus, { header: string; count: string }> = {
  pre_screening: { header: "text-sky-700", count: "bg-sky-100 text-sky-700" },
  screening: { header: "text-indigo-700", count: "bg-indigo-100 text-indigo-700" },
  randomized: { header: "text-emerald-700", count: "bg-emerald-100 text-emerald-700" },
  screen_failure: { header: "text-rose-700", count: "bg-rose-100 text-rose-700" },
};

function KanbanCard({
  screening,
  onMove,
}: {
  screening: ScreeningWithRelations;
  onMove: (id: string, status: ScreeningStatus) => void;
}) {
  const index = SCREENING_STATUS_ORDER.indexOf(screening.status);
  const prev = index > 0 ? SCREENING_STATUS_ORDER[index - 1] : null;
  const next =
    index < SCREENING_STATUS_ORDER.length - 1
      ? SCREENING_STATUS_ORDER[index + 1]
      : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", screening.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group cursor-grab rounded-md border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <Link
            href={`/patients/${screening.patient_id}`}
            className="block truncate text-xs font-semibold text-slate-900 hover:text-sky-700"
          >
            {screening.patients.last_name}, {screening.patients.first_name}
          </Link>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
            {screening.protocols.code_name}
          </p>
        </div>
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 text-slate-300"
          aria-hidden
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-medium tabular-nums text-slate-500">
          Match {Math.round(Number(screening.match_score))}%
        </span>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {prev ? (
            <button
              type="button"
              onClick={() => onMove(screening.id, prev)}
              aria-label={`Mover a ${SCREENING_STATUS_LABELS[prev]}`}
              title={`Mover a ${SCREENING_STATUS_LABELS[prev]}`}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={() => onMove(screening.id, next)}
              aria-label={`Mover a ${SCREENING_STATUS_LABELS[next]}`}
              title={`Mover a ${SCREENING_STATUS_LABELS[next]}`}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({
  screenings,
  onMove,
}: {
  screenings: ScreeningWithRelations[];
  onMove: (id: string, status: ScreeningStatus) => void;
}) {
  const [dragOver, setDragOver] = useState<ScreeningStatus | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {SCREENING_STATUS_ORDER.map((status) => {
        const items = screenings.filter((s) => s.status === status);
        const styles = COLUMN_STYLES[status];
        return (
          <section
            key={status}
            aria-label={SCREENING_STATUS_LABELS[status]}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, status);
            }}
            className={cn(
              "flex min-h-64 flex-col rounded-lg border bg-slate-100/60 transition-colors",
              dragOver === status
                ? "border-sky-400 bg-sky-50"
                : "border-slate-200"
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <h2 className={cn("text-xs font-semibold uppercase tracking-wide", styles.header)}>
                {SCREENING_STATUS_LABELS[status]}
              </h2>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  styles.count
                )}
              >
                {items.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-2.5 pb-2.5">
              {items.length === 0 ? (
                <p className="px-1 py-2 text-center text-[11px] text-slate-400">
                  Sin pacientes en esta etapa
                </p>
              ) : (
                items.map((s) => (
                  <KanbanCard key={s.id} screening={s} onMove={onMove} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

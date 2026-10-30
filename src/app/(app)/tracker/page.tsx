"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { Card } from "@/components/ui/Card";
import { KanbanBoard } from "@/components/tracker/KanbanBoard";
import { PipelineList } from "@/components/tracker/PipelineList";
import { useScreenings } from "@/hooks/useScreenings";
import { toErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ScreeningStatus } from "@/lib/types";

type TrackerView = "kanban" | "lista";

export default function TrackerPage() {
  const { screenings, loading, error, updateStatus } = useScreenings({
    includeMatchDetails: false,
  });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [view, setView] = useState<TrackerView>("kanban");

  const handleMove = async (
    id: string,
    status: ScreeningStatus,
    failureReason?: string
  ) => {
    setMoveError(null);
    try {
      await updateStatus(id, status, failureReason);
    } catch (e) {
      setMoveError(toErrorMessage(e, "No se pudo mover al paciente"));
    }
  };

  return (
    <>
      <PageHeader
        title="Screening Tracker"
        description="El tablero y la lista cambian la misma etapa del pipeline."
        actions={
          screenings.length > 0 ? (
            <div
              role="group"
              aria-label="Vista del pipeline"
              className="inline-flex w-full rounded-full bg-slate-100 p-1 text-sm sm:w-auto"
            >
              <ViewButton
                active={view === "kanban"}
                onClick={() => setView("kanban")}
              >
                Kanban
              </ViewButton>
              <ViewButton
                active={view === "lista"}
                onClick={() => setView("lista")}
              >
                Lista
              </ViewButton>
            </div>
          ) : null
        }
      />

      {moveError ? (
        <div className="mb-4">
          <ErrorState message={moveError} />
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Cargando pipeline…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : screenings.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin pacientes en el pipeline"
            action={
              <Link
                href="/protocols"
                className="text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Ir a Protocol Matcher →
              </Link>
            }
          />
        </Card>
      ) : (
        view === "lista" ? (
          <PipelineList
            screenings={screenings}
            onMove={(id, status, failureReason) =>
              void handleMove(id, status, failureReason)
            }
          />
        ) : (
          <KanbanBoard
            screenings={screenings}
            onMove={(id, status, failureReason) =>
              void handleMove(id, status, failureReason)
            }
          />
        )
      )}
    </>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "w-auto! flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none",
        active
          ? "bg-white text-violet-900 ring-1 ring-violet-200"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

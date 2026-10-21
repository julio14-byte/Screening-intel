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
import { useScreenings } from "@/hooks/useScreenings";
import { toErrorMessage } from "@/lib/errors";
import type { ScreeningStatus } from "@/lib/types";

export default function TrackerPage() {
  const { screenings, loading, error, updateStatus } = useScreenings({
    includeMatchDetails: false,
  });
  const [moveError, setMoveError] = useState<string | null>(null);

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
      <PageHeader title="Screening Tracker" />

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
        <KanbanBoard
          screenings={screenings}
          onMove={(id, status) => void handleMove(id, status)}
        />
      )}
    </>
  );
}

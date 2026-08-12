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
import type { ScreeningStatus } from "@/lib/types";

export default function TrackerPage() {
  const { screenings, loading, error, updateStatus } = useScreenings();
  const [moveError, setMoveError] = useState<string | null>(null);

  const handleMove = async (id: string, status: ScreeningStatus) => {
    setMoveError(null);
    try {
      await updateStatus(id, status);
    } catch (e) {
      setMoveError(
        e instanceof Error ? e.message : "No se pudo mover al paciente"
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Screening Tracker"
        description="Pipeline de screening: arrastrá las tarjetas (o usá las flechas) para mover pacientes entre etapas."
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
            title="El pipeline está vacío"
            description="Ejecutá el matching de un protocolo y agregá pacientes a pre-screening para verlos acá."
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

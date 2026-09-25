"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { Card } from "@/components/ui/Card";
import { KanbanBoard } from "@/components/tracker/KanbanBoard";
import { ScreeningProcessNote } from "@/components/screening/ScreeningProcessNote";
import { useScreenings } from "@/hooks/useScreenings";
import { fetchIwrsCatalog, postIwrsRandomize } from "@/lib/iwrs/client";
import type { ScreeningStatus } from "@/lib/types";

export default function TrackerPage() {
  const { screenings, loading, error, updateStatus, refetch } = useScreenings({
    includeMatchDetails: false,
  });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [iwrsIds, setIwrsIds] = useState<Set<string>>(new Set());
  const [sponsorIds, setSponsorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void Promise.resolve()
      .then(() => fetchIwrsCatalog())
      .then((json) => {
        const enabled = json.configs.filter((config) => config.enabled);
        setIwrsIds(new Set(enabled.map((config) => config.protocol_id)));
        setSponsorIds(
          new Set(
            enabled
              .filter((config) => config.source === "sponsor")
              .map((config) => config.protocol_id)
          )
        );
      })
      .catch(() => {
        setIwrsIds(new Set());
        setSponsorIds(new Set());
      });
  }, []);

  const handleMove = async (id: string, status: ScreeningStatus) => {
    setMoveError(null);
    const screening = screenings.find((row) => row.id === id);
    if (
      status === "randomized" &&
      screening &&
      iwrsIds.has(screening.protocol_id)
    ) {
      setMoveError(
        "Este protocolo usa IWRS. Randomizá desde el módulo IWRS; no arrastres la tarjeta."
      );
      return;
    }
    try {
      await updateStatus(id, status);
    } catch (e) {
      setMoveError(
        e instanceof Error ? e.message : "No se pudo mover al paciente"
      );
    }
  };

  const handleRandomize = async (screeningId: string) => {
    setMoveError(null);
    const screening = screenings.find((row) => row.id === screeningId);
    if (screening && sponsorIds.has(screening.protocol_id)) {
      setMoveError(
        "Este protocolo usa el IWRS del sponsor. Registrá el kit en /iwrs; Crisvia no llama al IRT de Lilly ni de otra farmacéutica."
      );
      return;
    }
    try {
      await postIwrsRandomize(screeningId);
      await refetch();
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "No se pudo randomizar.");
    }
  };

  return (
    <>
      <PageHeader
        title="Screening Tracker"
        description="Pipeline de elegibilidad, no un sorteo. Si el protocolo tiene IWRS, Randomizado se asigna en /iwrs."
      />

      <ScreeningProcessNote />

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
          iwrsProtocolIds={iwrsIds}
          onMove={(id, status) => void handleMove(id, status)}
          onRandomize={(id) => void handleRandomize(id)}
        />
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { VerdictDot } from "@/components/ui/VerdictBadge";
import { CriteriaSummary } from "@/components/protocols/CriteriaSummary";
import { MatchResultsTable } from "@/components/protocols/MatchResultsTable";
import { useProtocolMatch } from "@/hooks/useProtocolMatch";

export default function ProtocolMatchPage({
  params,
}: PageProps<"/protocols/[id]/match">) {
  const { id } = use(params);
  const { protocol, results, existing, loading, error, enroll } =
    useProtocolMatch(id);

  const counts = useMemo(
    () => ({
      eligible: results.filter((r) => r.verdict === "eligible").length,
      pending: results.filter((r) => r.verdict === "pending").length,
      excluded: results.filter((r) => r.verdict === "excluded").length,
    }),
    [results]
  );

  if (loading) return <LoadingState label="Ejecutando motor de matching…" />;
  if (error || !protocol)
    return <ErrorState message={error ?? "Protocolo no encontrado"} />;

  return (
    <>
      <Link
        href="/protocols"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Volver a protocolos
      </Link>

      <PageHeader
        title={`Matching · ${protocol.code_name}`}
        description={protocol.title}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <CriteriaSummary protocol={protocol} />
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <VerdictDot verdict="eligible" />
              {counts.eligible} cumplen
            </span>
            <span className="flex items-center gap-1.5">
              <VerdictDot verdict="pending" />
              {counts.pending} pendientes
            </span>
            <span className="flex items-center gap-1.5">
              <VerdictDot verdict="excluded" />
              {counts.excluded} no cumplen
            </span>
          </div>
        </div>
      </Card>

      <Card>
        {results.length === 0 ? (
          <EmptyState
            title="No hay pacientes para evaluar"
            description="Cargá pacientes en el registro para ejecutar el matching."
          />
        ) : (
          <MatchResultsTable
            results={results}
            existing={existing}
            onEnroll={enroll}
          />
        )}
      </Card>
    </>
  );
}

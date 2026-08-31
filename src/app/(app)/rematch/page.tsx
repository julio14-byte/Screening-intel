"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleX, RefreshCw, UserPlus } from "lucide-react";
import { MatchRationalePanel } from "@/components/matching/MatchRationalePanel";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { useRematch, type RematchOpportunity } from "@/hooks/useRematch";
import { calculateAge, GENDER_LABELS } from "@/lib/utils";

function OpportunityCard({
  opportunity,
  onSend,
}: {
  opportunity: RematchOpportunity;
  onSend: (opportunity: RematchOpportunity, protocolId: string) => Promise<void>;
}) {
  const { patient, failures, candidates } = opportunity;
  const [sending, setSending] = useState<string | null>(null);

  const handleSend = async (protocolId: string) => {
    setSending(protocolId);
    try {
      await onSend(opportunity, protocolId);
    } finally {
      setSending(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        description={`${calculateAge(patient.birth_date)} años · ${GENDER_LABELS[patient.gender]}`}
        actions={
          <Link
            href={`/patients/${patient.id}`}
            className="text-xs font-medium text-sky-700 hover:text-sky-900"
          >
            Ver perfil →
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">Screen failure en:</span>
          {failures.map((f) => (
            <span
              key={f.id}
              className="inline-flex max-w-full items-center gap-1 break-words rounded-full bg-rose-50 px-2 py-0.5 font-mono text-[11px] font-medium text-rose-700"
            >
              <CircleX className="h-3 w-3 shrink-0" aria-hidden />
              {f.protocols.code_name}
            </span>
          ))}
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No hay otros protocolos activos compatibles por el momento.
            Revisá el perfil clínico o esperá nuevos protocolos.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {candidates.map(({ protocol, result }) => (
              <li key={protocol.id} className="space-y-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 w-full">
                    <p className="text-xs font-semibold text-slate-900 break-words">
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {protocol.code_name}
                      </span>
                      {protocol.title}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-center">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <VerdictBadge verdict={result.verdict} />
                      <ScoreBar score={result.score} />
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        type="button"
                        disabled={sending === protocol.id}
                        onClick={() => handleSend(protocol.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-40 sm:flex-initial sm:py-1"
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {sending === protocol.id ? "Enviando…" : "A pre-screening"}
                      </button>
                      <Link
                        href={`/protocols/${protocol.id}/match`}
                        className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex-initial sm:py-1"
                        title="Ver matching completo del protocolo"
                      >
                        Matching
                        <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
                <MatchRationalePanel
                  compact
                  input={{
                    protocol: {
                      code_name: protocol.code_name,
                      title: protocol.title,
                    },
                    patient: {
                      first_name: patient.first_name,
                      last_name: patient.last_name,
                      birth_date: patient.birth_date,
                      gender: patient.gender,
                    },
                    verdict: result.verdict,
                    score: result.score,
                    details: result.details,
                    context: "rematch",
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export default function RematchPage() {
  const { opportunities, loading, error, sendToPreScreening } = useRematch();

  return (
    <>
      <PageHeader
        title="Re-Match & Follow-up"
        description="Screen failures y protocolos alternativos donde el paciente podría encajar."
      />

      {loading ? (
        <LoadingState label="Analizando alternativas de re-matching…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : opportunities.length === 0 ? (
        <Card>
          <EmptyState
            title="No hay pacientes con screen failure"
            description="Cuando un paciente falle el screening de un protocolo, acá vas a ver automáticamente en qué otros estudios activos podría participar."
            action={
              <Link
                href="/tracker"
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Ir al Screening Tracker
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.patient.id}
              opportunity={opportunity}
              onSend={sendToPreScreening}
            />
          ))}
        </div>
      )}
    </>
  );
}

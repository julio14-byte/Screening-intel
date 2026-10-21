"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleX, RefreshCw, UserPlus } from "lucide-react";
import { CriterionEvidenceList } from "@/components/matching/CriterionEvidenceList";
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
import { useRole } from "@/contexts/role-context";
import {
  useRematch,
  type RematchOpportunity,
  type ReuseBasis,
} from "@/hooks/useRematch";
import { toErrorMessage } from "@/lib/errors";
import { studySubjectCaption } from "@/lib/profile/demographics";
import { calculateAge, GENDER_LABELS } from "@/lib/utils";

function OpportunityCard({
  opportunity,
  onSend,
  onConsent,
  onRevoke,
}: {
  opportunity: RematchOpportunity;
  onSend: (opportunity: RematchOpportunity, protocolId: string) => Promise<void>;
  onConsent: (
    patientId: string,
    basis: ReuseBasis,
    note: string
  ) => Promise<void>;
  onRevoke: (consentId: string) => Promise<void>;
}) {
  const { patient, failures, candidates, reuse, reuseSchemaMissing } =
    opportunity;
  const { isReadOnly } = useRole();
  const [sending, setSending] = useState<string | null>(null);
  const [basis, setBasis] = useState<ReuseBasis>("written");
  const [note, setNote] = useState("");
  const [consentError, setConsentError] = useState<string | null>(null);
  const [savingConsent, setSavingConsent] = useState(false);

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
        description={[
          studySubjectCaption(patient),
          `${calculateAge(patient.birth_date)} años`,
          GENDER_LABELS[patient.gender],
        ]
          .filter(Boolean)
          .join(" · ")}
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
        <ul className="space-y-1">
          {failures.map((failure) => (
            <li
              key={failure.id}
              className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-900"
            >
              <span className="inline-flex items-center gap-1 font-mono font-medium">
                <CircleX className="h-3 w-3 shrink-0" aria-hidden />
                {failure.protocols.code_name}
              </span>
              <p className="mt-0.5 text-rose-800">
                {failure.failure_reason?.trim() || "Sin motivo"}
              </p>
            </li>
          ))}
        </ul>

        {reuseSchemaMissing ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Falta aplicar la migración de consentimiento de reutilización
            (20261021040000_explainable_rematch_consent.sql). Hasta entonces no
            se buscan otros protocolos.
          </p>
        ) : null}

        {!reuseSchemaMissing && !reuse ? (
          <form
            className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSavingConsent(true);
              setConsentError(null);
              void onConsent(patient.id, basis, note)
                .catch((error: unknown) => {
                  setConsentError(
                    toErrorMessage(
                      error,
                      "No se pudo registrar el consentimiento."
                    )
                  );
                })
                .finally(() => setSavingConsent(false));
            }}
          >
            <p className="text-xs font-medium text-slate-800">Autorización del paciente</p>
            <label className="block text-xs text-slate-700">
              Cómo se obtuvo
              <select
                value={basis}
                onChange={(event) =>
                  setBasis(event.target.value as ReuseBasis)
                }
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="written">Consentimiento escrito</option>
                <option value="verbal_documented">
                  Consentimiento verbal, documentado por el equipo
                </option>
              </select>
            </label>
            <label className="block text-xs text-slate-700">
              Nota (opcional)
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            {consentError ? (
              <p className="text-xs text-rose-700">{consentError}</p>
            ) : null}
            <button
              type="submit"
              disabled={isReadOnly || savingConsent}
              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 disabled:opacity-40"
            >
              {isReadOnly
                ? "Tu rol no puede autorizar"
                : savingConsent
                  ? "Guardando…"
                  : "Registrar autorización"}
            </button>
          </form>
        ) : null}

        {reuse ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <p>
              Autorización vigente ({reuse.consented_on}
              {reuse.basis === "written"
                ? ", por escrito"
                : ", verbal documentado"}
              ).
            </p>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => void onRevoke(reuse.id)}
              className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Revocar
            </button>
          </div>
        ) : null}

        {reuse && candidates.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No hay otros protocolos activos compatibles por el momento.
            Revisá el perfil clínico o esperá nuevos protocolos.
          </p>
        ) : null}
        {reuse && candidates.length > 0 ? (
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
                <CriterionEvidenceList details={result.details} />
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
        ) : null}
      </CardBody>
    </Card>
  );
}

export default function RematchPage() {
  const {
    opportunities,
    loading,
    error,
    sendToPreScreening,
    recordReuseConsent,
    revokeReuseConsent,
  } = useRematch();

  return (
    <>
      <PageHeader title="Re-Match" />

      {loading ? (
        <LoadingState label="Analizando alternativas de re-matching…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : opportunities.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin screen failures"
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
              onConsent={recordReuseConsent}
              onRevoke={revokeReuseConsent}
            />
          ))}
        </div>
      )}
    </>
  );
}

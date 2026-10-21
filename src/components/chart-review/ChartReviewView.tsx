"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { CriterionReviewRow } from "@/components/chart-review/CriterionReviewRow";
import { MedicationReconciliation } from "@/components/chart-review/MedicationReconciliation";
import { useRole } from "@/contexts/role-context";
import { useChartReview } from "@/hooks/useChartReview";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import { useSiteProfile } from "@/hooks/useSiteProfile";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { downloadCsv } from "@/lib/export/dashboardCsv";
import { getSupabaseClient } from "@/lib/supabase/client";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import { siteFileSlug } from "@/lib/site/profile";
import {
  buildReviewRows,
  reviewSheetToCsv,
  summarizeReview,
} from "@/lib/chart-review/review";
import { toErrorMessage } from "@/lib/errors";
import type { Protocol } from "@/lib/types";

function useProtocol(protocolId: string) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = useSupabaseReady();
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const { data, error: err } = await getSupabaseClient()
          .from("protocols")
          .select("id, clinic_id, title, code_name, inclusion_criteria, exclusion_criteria, status, created_at")
          .eq("id", protocolId)
          .maybeSingle();
        if (err) throw err;
        if (!data) setError("Protocolo no encontrado");
        else setProtocol(data as Protocol);
      } catch (e) {
        setError(toErrorMessage(e, "Error al cargar el protocolo"));
      }
    })();
  }, [ready, protocolId]);
  return { protocol, error };
}

export function ChartReviewView({
  protocolId,
  patientId,
}: {
  protocolId: string;
  patientId: string;
}) {
  const { protocol, error: protocolError } = useProtocol(protocolId);
  const { patient, profile, loading: patientLoading, error: patientError } = usePatientDetail(patientId);
  const review = useChartReview(patientId, protocolId);
  const { site } = useSiteProfile();
  const { hasPermission } = useRole();
  const canWrite = hasPermission("patients:write");
  const [stamp, setStamp] = useState<string | null>(null);

  const result = useMemo(
    () => (patient && protocol ? evaluatePatientAgainstProtocol(patient, profile, protocol) : null),
    [patient, profile, protocol]
  );
  const rows = useMemo(
    () => (result && protocol ? buildReviewRows(result.details, review.reviews, protocol) : []),
    [result, protocol, review.reviews]
  );
  const summary = useMemo(() => summarizeReview(rows), [rows]);

  const fail = protocolError ?? patientError ?? review.error;
  if (fail) return <ErrorState message={fail} />;
  if (patientLoading || review.loading || !patient || !protocol || !result) {
    return <LoadingState label="Cargando expediente…" />;
  }

  const exportCsv = () =>
    downloadCsv(
      `${siteFileSlug(site) || "sitio"}-revision-${protocol.code_name}-${patient.subject_code ?? "sujeto"}-${new Date().toISOString().slice(0, 10)}.csv`,
      reviewSheetToCsv(rows, { subjectCode: patient.subject_code ?? null, protocolCode: protocol.code_name }, site)
    );

  const print = () => {
    setStamp(new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }));
    requestAnimationFrame(() => window.print());
  };

  return (
    <div className="space-y-5">
      <Link
        href={`/protocols/${protocol.id}/match`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 print:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Volver al matching
      </Link>

      <PageHeader
        title={`Revisión de expediente · ${protocol.code_name}`}
        description={`${patient.last_name}, ${patient.first_name}${patient.subject_code ? ` · sujeto ${patient.subject_code}` : ""}`}
        actions={
          <>
            <Button variant="secondary" className="print:hidden" onClick={print}>
              <Printer className="h-4 w-4" aria-hidden />
              Imprimir o guardar PDF
            </Button>
            <Button variant="secondary" className="print:hidden" onClick={exportCsv}>
              <Download className="h-4 w-4" aria-hidden />
              Exportar CSV
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader title="Estado de la revisión" />
        <CardBody className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <span className="flex items-center gap-1.5">
              Sistema: <VerdictBadge verdict={result.verdict} />
            </span>
            <span>
              {summary.confirmed} de {summary.total} criterios confirmados en la fuente
            </span>
            {summary.unreviewed > 0 ? <span>{summary.unreviewed} sin revisar</span> : null}
            {summary.open > 0 ? <span>{summary.open} con pendientes</span> : null}
            {summary.discrepancies > 0 ? (
              <span className="font-medium text-rose-700">{summary.discrepancies} discrepancia(s) con la fuente</span>
            ) : null}
          </div>
          <p
            className={
              summary.readyForInvestigator
                ? "rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                : "rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700"
            }
          >
            {summary.readyForInvestigator
              ? "Revisión completa y sin pendientes. La decisión de elegibilidad es del investigador."
              : "La revisión aún tiene criterios por confirmar. La decisión de elegibilidad es del investigador."}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Criterios del protocolo"
          description="Para confirmar o rechazar un criterio, cita el documento, su fecha y, si aplica, el valor que dice."
        />
        <CardBody>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">El protocolo no tiene criterios definidos.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <CriterionReviewRow
                  key={row.detail.criterion}
                  row={row}
                  patientId={patient.id}
                  protocolId={protocol.id}
                  canWrite={canWrite}
                  onSubmit={review.addReview}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <MedicationReconciliation
        medications={review.medications}
        profileMedications={profile?.medications ?? []}
        excludedMedications={protocol.exclusion_criteria?.excluded_medications ?? []}
        washoutDays={protocol.exclusion_criteria?.washout_days}
        canWrite={canWrite}
        onAdd={review.addMedication}
        onUpdate={review.updateMedication}
      />

      {stamp ? <p className="text-[11px] text-slate-500">Crisvia · {stamp}</p> : null}
    </div>
  );
}

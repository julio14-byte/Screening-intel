"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import config from "@/config";
import {
  hasSiteIdentity,
  siteDisplayName,
  siteHeaderRows,
  type SiteProfile,
} from "@/lib/site/profile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Field";
import {
  applyCohort,
  buildFeasibilityReport,
  CHART_WINDOW_MONTHS,
  feasibilityPercent,
  sponsorFeasibilityLetter,
  type ChartWindowMonths,
  type CohortChoice,
  type FeasibilityReportData,
} from "@/lib/matching/feasibility";
import type { MatchResult } from "@/lib/types";

function Count({
  label,
  value,
  total,
  showShare = true,
}: {
  label: string;
  value: number;
  total: number;
  showShare?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {value}
        {showShare ? (
          <span className="ml-1 text-xs font-medium text-slate-500">
            {feasibilityPercent(value, total)}%
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function FeasibilityReport({
  results,
  protocol,
  site,
}: {
  results: MatchResult[];
  protocol: { code_name: string; title: string };
  site?: SiteProfile | null;
}) {
  const [cohortKey, setCohortKey] = useState("registry");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [preparedOn, setPreparedOn] = useState<Date | null>(null);
  useEffect(() => {
    setPreparedOn(new Date());
  }, []);
  const cohort = useMemo(() => {
    const mapped = results.map((result) => ({
      result,
      registeredOn: result.patient.created_at,
      chartUpdatedOn: result.profile?.updated_at ?? null,
    }));
    if (!preparedOn) {
      return { kept: mapped, leftOut: 0, from: null as string | null, to: "", label: "" };
    }
    const choice: CohortChoice =
      cohortKey === "registry"
        ? { kind: "registry" }
        : { kind: "chart_window", months: Number(cohortKey) as ChartWindowMonths };
    return applyCohort(mapped, choice, preparedOn);
  }, [results, cohortKey, preparedOn]);
  const report: FeasibilityReportData = buildFeasibilityReport(
    cohort.kept.map((row) => row.result)
  );
  const siteName = site && hasSiteIdentity(site) ? siteDisplayName(site) : null;
  const letter = preparedOn
    ? sponsorFeasibilityLetter({
        siteName,
        protocolCode: protocol.code_name,
        protocolTitle: protocol.title,
        preparedOn: cohort.to,
        cohortLabel: cohort.label,
        report,
      })
    : "";

  const printReport = () => {
    requestAnimationFrame(() => window.print());
  };

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section id="feasibility-report" className="mb-4 print:mb-0">
    <Card className="print:border-0 print:shadow-none">
      <CardHeader
        title="Informe de factibilidad"
        description={`${protocol.code_name} · ${protocol.title}`}
        actions={
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 print:hidden"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Imprimir o guardar PDF
          </button>
        }
      />
      <CardBody className="space-y-4">
        <div className="rounded-md border border-violet-200 bg-violet-50/60 px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md print:hidden">
              <SelectInput
                label="Cohorte de la hoja"
                value={cohortKey}
                onChange={(event) => {
                  setCohortKey(event.target.value);
                  setCopyState("idle");
                }}
              >
                <option value="registry">Registro completo del centro</option>
                {CHART_WINDOW_MONTHS.map((months) => (
                  <option key={months} value={String(months)}>
                    Expediente actualizado en los últimos {months} meses
                  </option>
                ))}
              </SelectInput>
            </div>
            <button
              type="button"
              onClick={() => void copyLetter()}
              disabled={!preparedOn}
              className="inline-flex items-center rounded-md border border-violet-300 bg-white px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50 print:hidden"
            >
              {copyState === "copied" ? "Texto copiado" : "Copiar texto para el patrocinador"}
            </button>
          </div>
          {preparedOn ? (
            <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-800">{letter}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Preparando la fecha de la hoja…</p>
          )}
          {copyState === "failed" ? (
            <p className="mt-2 text-xs text-amber-800 print:hidden">
              No se pudo copiar. Selecciona el texto de la hoja.
            </p>
          ) : null}
        </div>
        {site && hasSiteIdentity(site) ? (
          <div className="border-b border-slate-200 pb-3">
            <p className="text-base font-semibold text-slate-900">
              {siteDisplayName(site)}
            </p>
            <dl className="mt-1 grid gap-x-6 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2">
              {siteHeaderRows(site).map((row) => (
                <div key={row.label} className="flex gap-1">
                  <dt className="shrink-0 font-medium text-slate-500">{row.label}:</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : site ? (
          <Link
            href={config.routes.app.siteSettings}
            className="block text-xs font-medium text-violet-700 underline print:hidden"
          >
            Agregar los datos del centro al informe
          </Link>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Count label="Evaluados" value={report.evaluated} total={report.evaluated} showShare={false} />
          <Count label="Parecen cumplir" value={report.eligible} total={report.evaluated} />
          <Count label="Pendientes" value={report.pending} total={report.evaluated} />
          <Count label="No cumplen" value={report.excluded} total={report.evaluated} />
        </div>

        {!report.criteriaDefined ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Sin criterios cargados.
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-900">
                {report.topExcluding
                  ? `El criterio que más deja afuera es “${report.topExcluding.criterion}”: ${report.topExcluding.fail} de ${report.evaluated}.`
                  : "Ningún criterio dejó pacientes afuera."}
              </p>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {report.topMissing
                  ? `El criterio que más pide información es “${report.topMissing.criterion}”: ${report.topMissing.missing} de ${report.evaluated}.`
                  : "Ningún criterio quedó sin información."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <caption className="sr-only">
                  Pacientes por criterio, sin datos identificables
                </caption>
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Criterio</th>
                    <th className="px-2 py-1 text-right font-medium">Cumplen</th>
                    <th className="px-2 py-1 text-right font-medium">No cumplen</th>
                    <th className="py-1 pl-2 text-right font-medium">Falta información</th>
                  </tr>
                </thead>
                <tbody>
                  {report.criteria.map((row) => (
                    <tr key={`${row.type}-${row.criterion}`} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-800">
                        {row.criterion}
                        <span className="ml-1 text-[10px] uppercase text-slate-400">
                          {row.type === "inclusion" ? "inclusión" : "exclusión"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.pass}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.fail}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">{row.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </CardBody>
    </Card>
    </section>
  );
}

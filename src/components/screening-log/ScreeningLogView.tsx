"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import config from "@/config";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useScreenings } from "@/hooks/useScreenings";
import { useSiteProfile } from "@/hooks/useSiteProfile";
import { downloadCsv } from "@/lib/export/dashboardCsv";
import {
  buildScreeningLog,
  screeningLogToCsv,
  summarizeScreeningLog,
} from "@/lib/screening-log/log";
import {
  hasSiteIdentity,
  siteDisplayName,
  siteFileSlug,
  siteHeaderRows,
} from "@/lib/site/profile";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  screening: "bg-sky-50 text-sky-800",
  pre_screening: "bg-slate-100 text-slate-700",
  randomized: "bg-emerald-50 text-emerald-800",
  screen_failure: "bg-rose-50 text-rose-800",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

export function ScreeningLogView() {
  const { screenings, loading, error } = useScreenings({
    includeMatchDetails: false,
  });
  const { site } = useSiteProfile();
  const [protocolId, setProtocolId] = useState("");
  const [includePre, setIncludePre] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);

  const protocols = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of screenings) {
      map.set(s.protocol_id, `${s.protocols.code_name} · ${s.protocols.title}`);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [screenings]);

  const entries = useMemo(
    () =>
      buildScreeningLog(screenings, {
        protocolId: protocolId || undefined,
        includePreScreening: includePre,
      }),
    [screenings, protocolId, includePre]
  );
  const summary = useMemo(() => summarizeScreeningLog(entries), [entries]);

  const selectedProtocol = protocols.find(([id]) => id === protocolId)?.[1];

  const exportCsv = () =>
    downloadCsv(
      `${siteFileSlug(site) || "sitio"}-bitacora-screening-${new Date().toISOString().slice(0, 10)}.csv`,
      screeningLogToCsv(entries, site)
    );

  const print = () => {
    setStamp(
      new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })
    );
    requestAnimationFrame(() => window.print());
  };

  if (loading) return <LoadingState label="Cargando bitácora…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-slate-600">
              Protocolo
              <select
                value={protocolId}
                onChange={(e) => setProtocolId(e.target.value)}
                className="mt-1 block w-64 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">Todos</option>
                {protocols.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={includePre}
                onChange={(e) => setIncludePre(e.target.checked)}
              />
              Incluir pre-screening
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={print} disabled={entries.length === 0}>
              <Printer className="h-4 w-4" aria-hidden />
              Imprimir o guardar PDF
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>
              <Download className="h-4 w-4" aria-hidden />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="hidden border-b border-slate-200 pb-3 print:block">
          <p className="text-base font-semibold text-slate-900">
            Bitácora de screening{site && siteDisplayName(site) ? ` · ${siteDisplayName(site)}` : ""}
          </p>
          {selectedProtocol ? (
            <p className="text-xs text-slate-600">{selectedProtocol}</p>
          ) : null}
          {site && hasSiteIdentity(site) ? (
            <dl className="mt-1 grid gap-x-6 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2">
              {siteHeaderRows(site).map((row) => (
                <div key={row.label} className="flex gap-1">
                  <dt className="shrink-0 font-medium text-slate-500">{row.label}:</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {site && !hasSiteIdentity(site) ? (
          <Link
            href={config.routes.app.siteSettings}
            className="block text-xs font-medium text-violet-700 underline print:hidden"
          >
            Agregar los datos del centro a la bitácora
          </Link>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="En screening" value={summary.screened} />
          <Stat label="En curso" value={summary.inProgress} />
          <Stat label="Randomizados" value={summary.randomized} />
          <Stat label="Screen failures" value={summary.screenFailures} />
          <Stat label="% screen failure" value={`${summary.screenFailureRate}%`} />
        </div>

        {summary.withoutSubjectCode > 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950 print:hidden">
            {summary.withoutSubjectCode} sujeto(s) sin código. Asigna el código en
            el registro del paciente para que la bitácora no dependa del nombre.
          </p>
        ) : null}

        {entries.length === 0 ? (
          <EmptyState title="Sin sujetos en screening para este filtro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <caption className="sr-only">
                Bitácora de screening identificada solo por código de sujeto
              </caption>
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">No.</th>
                  <th className="px-2 py-1 font-medium">Sujeto</th>
                  <th className="px-2 py-1 font-medium">Protocolo</th>
                  <th className="px-2 py-1 font-medium">Fecha de screening</th>
                  <th className="px-2 py-1 font-medium">Estado</th>
                  <th className="px-2 py-1 font-medium">Fecha de resultado</th>
                  <th className="py-1 pl-2 font-medium">Motivo de screen failure</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.screeningId} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-2 tabular-nums text-slate-500">{e.seq}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-medium tabular-nums",
                        e.hasSubjectCode ? "text-slate-900" : "text-amber-700"
                      )}
                    >
                      {e.subjectCode}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{e.protocolCode}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-700">{e.screenedOn}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_STYLE[e.status]
                        )}
                      >
                        {e.statusLabel}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-700">{e.outcomeOn || "—"}</td>
                    <td className="py-1.5 pl-2 text-slate-700">{e.failureReason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stamp ? (
          <p className="text-[11px] text-slate-500">Crisvia · {stamp}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardFilters, type TrafficLightFilter } from "@/components/dashboard/DashboardFilters";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardPatientsTable } from "@/components/dashboard/DashboardPatientsTable";
import { Button } from "@/components/ui/Button";
import { downloadCsv, screeningsToCsv } from "@/lib/export/dashboardCsv";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { OperationalFunnel } from "@/components/dashboard/OperationalFunnel";
import { ProductModulesStrip } from "@/components/product/ProductModulesStrip";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";
import { screeningToVerdict } from "@/lib/dashboard/traffic-light";
import { routes } from "@/lib/app/routes";
import { useScreenings } from "@/hooks/useScreenings";
import { normalizeTerm } from "@/lib/utils";

type DashboardViewProps = {
  title?: string;
  defaultTrafficFilter?: TrafficLightFilter;
};

export function DashboardView({
  title = "Dashboard",
  defaultTrafficFilter = "all",
}: DashboardViewProps) {
  const { screenings, loading, error } = useScreenings();
  const [search, setSearch] = useState("");
  const [trafficFilter, setTrafficFilter] =
    useState<TrafficLightFilter>(defaultTrafficFilter);

  const metrics = useMemo(
    () => computeDashboardMetrics(screenings),
    [screenings]
  );

  const filteredRows = useMemo(() => {
    const term = normalizeTerm(search);

    return screenings.filter((screening) => {
      const verdict = screeningToVerdict(screening);
      if (trafficFilter !== "all" && verdict !== trafficFilter) return false;

      if (!term) return true;

      const patient = `${screening.patients.first_name} ${screening.patients.last_name} ${screening.patients.subject_code ?? ""}`;
      const protocol = `${screening.protocols.code_name} ${screening.protocols.title}`;

      return (
        normalizeTerm(patient).includes(term) ||
        normalizeTerm(protocol).includes(term)
      );
    });
  }, [screenings, search, trafficFilter]);

  return (
    <>
      <PageHeader
        title={title}
        description="Embudo del site: quién está en screening, el semáforo y los screen failures a recuperar."
        actions={
          filteredRows.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `dashboard-screening-${new Date().toISOString().slice(0, 10)}.csv`,
                  screeningsToCsv(filteredRows)
                )
              }
            >
              <Download className="h-4 w-4" aria-hidden />
              Exportar CSV
            </Button>
          ) : null
        }
      />

      {loading ? (
        <LoadingState label="Cargando pacientes en screening…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : screenings.length === 0 ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <EmptyState
              title="Todavía no hay screening"
              description="Cargá pacientes que YA están en tu site, completá el perfil clínico y corré el matcher de un protocolo."
              action={
                <Link
                  href={routes.app.protocols}
                  className="text-xs font-medium text-indigo-700"
                >
                  Ir a Protocolos Clínicos →
                </Link>
              }
            />
          </Card>
          <div className="lg:col-span-2">
            <ProductModulesStrip />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <DashboardKpiCards metrics={metrics} />

          <div className="grid items-stretch gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <OperationalFunnel screenings={screenings} />
            </div>
            <div className="lg:col-span-2">
              <ProductModulesStrip />
            </div>
          </div>

          <Card>
            <CardHeader
              title="Pacientes en screening"
              description="Semáforo de inclusión y exclusión por protocolo activo."
            />
            <CardBody className="space-y-4">
              <DashboardFilters
                search={search}
                onSearchChange={setSearch}
                trafficFilter={trafficFilter}
                onTrafficFilterChange={setTrafficFilter}
              />
              <DashboardPatientsTable rows={filteredRows} />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

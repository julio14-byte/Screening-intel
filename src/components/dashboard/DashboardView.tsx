"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardFilters, type TrafficLightFilter } from "@/components/dashboard/DashboardFilters";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardPatientsTable } from "@/components/dashboard/DashboardPatientsTable";
import { ProductMetricsKpis } from "@/components/dashboard/ProductMetricsKpis";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";
import { screeningToVerdict } from "@/lib/dashboard/traffic-light";
import type { ProductMetrics } from "@/lib/dashboard/productMetrics";
import { routes } from "@/lib/app/routes";
import { useScreenings } from "@/hooks/useScreenings";
import { normalizeTerm } from "@/lib/utils";

type DashboardViewProps = {
  title?: string;
  description?: string;
  defaultTrafficFilter?: TrafficLightFilter;
  productMetrics?: ProductMetrics | null;
  productMetricsError?: string | null;
  showProductMetrics?: boolean;
};

export function DashboardView({
  title = "Tablero Central",
  description = "Vista operativa del research site: semáforos clínicos, screening y cohortes activas.",
  defaultTrafficFilter = "all",
  productMetrics = null,
  productMetricsError = null,
  showProductMetrics = false,
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

      const patient = `${screening.patients.first_name} ${screening.patients.last_name}`;
      const protocol = `${screening.protocols.code_name} ${screening.protocols.title}`;

      return (
        normalizeTerm(patient).includes(term) ||
        normalizeTerm(protocol).includes(term)
      );
    });
  }, [screenings, search, trafficFilter]);

  return (
    <>
      <PageHeader title={title} description={description} />

      {showProductMetrics ? (
        <div className="mb-6">
          <ProductMetricsKpis
            productMetrics={productMetrics}
            error={productMetricsError}
          />
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Cargando pacientes en screening…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : screenings.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin pacientes en screening"
            description="Registra pacientes y ejecuta matching en un protocolo para poblar el tablero."
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
      ) : (
        <div className="space-y-5">
          <DashboardKpiCards metrics={metrics} />

          <Card>
            <CardHeader
              title="Pacientes en screening"
              description="Semáforos de inclusión/exclusión por protocolo activo."
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardFilters, type TrafficLightFilter } from "@/components/dashboard/DashboardFilters";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { DashboardPatientsTable } from "@/components/dashboard/DashboardPatientsTable";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
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
      <PageHeader title={title} />

      {loading ? (
        <LoadingState label="Cargando pacientes en screening…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : screenings.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin pacientes en screening"
            description="Registra pacientes y ejecuta matching en un protocolo para poblar el Dashboard. Si ya cargaste pacientes en Supabase, ejecutá también la parte de screenings en seed.sql."
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

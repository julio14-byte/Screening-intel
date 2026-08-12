"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  FlaskConical,
  KanbanSquare,
  ListChecks,
  RefreshCw,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const MODULES = [
  {
    href: "/patients",
    title: "Patient Registry",
    description: "Base de pacientes de la clínica: alta, búsqueda y perfil clínico.",
    icon: Users,
  },
  {
    href: "/protocols",
    title: "Protocol Matcher",
    description: "Protocolos con criterios estructurados y motor de cruce con semáforos.",
    icon: FlaskConical,
  },
  {
    href: "/tracker",
    title: "Screening Tracker",
    description: "Kanban del pipeline: pre-screening, screening, randomización y fallas.",
    icon: KanbanSquare,
  },
  {
    href: "/rematch",
    title: "Re-Match & Follow-up",
    description: "Alternativas activas para pacientes con screen failure.",
    icon: RefreshCw,
  },
];

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </Card>
  );
}

export default function HomePage() {
  const { stats, loading, error } = useDashboardStats();

  return (
    <>
      <PageHeader
        title="Panel general"
        description="Estado actual del pre-screening y los protocolos de tu research site."
      />

      {loading ? (
        <LoadingState label="Cargando métricas…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : stats ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Pacientes" value={stats.patients} icon={Users} tone="text-sky-600" />
          <StatCard label="Protocolos activos" value={stats.activeProtocols} icon={FlaskConical} tone="text-indigo-600" />
          <StatCard label="En pipeline" value={stats.inPipeline} icon={ListChecks} tone="text-amber-600" />
          <StatCard label="Randomizados" value={stats.randomized} icon={CircleCheck} tone="text-emerald-600" />
          <StatCard label="Screen failures" value={stats.screenFailures} icon={CircleX} tone="text-rose-600" />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {MODULES.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-4 transition-colors group-hover:border-sky-300">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <ArrowRight
                  className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600"
                  aria-hidden
                />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

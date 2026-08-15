"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Filter,
  KanbanSquare,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { VerdictDot } from "@/components/ui/VerdictBadge";
import { PricingSection } from "@/components/billing/PricingSection";
import { ProductMetricsKpis } from "@/components/dashboard/ProductMetricsKpis";
import { useScreenings } from "@/hooks/useScreenings";
import type { ProductMetrics } from "@/lib/dashboard/productMetrics";
import type { ScreeningStatus, ScreeningWithRelations } from "@/lib/types";
import {
  cn,
  SCREENING_STATUS_LABELS,
  SCREENING_STATUS_ORDER,
} from "@/lib/utils";

const FUNNEL_STYLES: Record<
  ScreeningStatus,
  { bar: string; badge: string; ring: string; width: string }
> = {
  pre_screening: {
    bar: "from-sky-400 to-cyan-500",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    ring: "ring-sky-200",
    width: "w-full",
  },
  screening: {
    bar: "from-indigo-400 to-violet-500",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    ring: "ring-indigo-200",
    width: "w-[82%]",
  },
  randomized: {
    bar: "from-emerald-400 to-teal-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ring: "ring-emerald-200",
    width: "w-[58%]",
  },
  screen_failure: {
    bar: "from-rose-400 to-pink-500",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    ring: "ring-rose-200",
    width: "w-[42%]",
  },
};

function countByStatus(
  screenings: ScreeningWithRelations[],
  status: ScreeningStatus
) {
  return screenings.filter((s) => s.status === status).length;
}

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function ScreeningFunnelDashboard({
  productMetrics = null,
  productMetricsError = null,
}: {
  productMetrics?: ProductMetrics | null;
  productMetricsError?: string | null;
}) {
  const { screenings, loading, error } = useScreenings();

  const stats = useMemo(() => {
    const total = screenings.length;
    const pre = countByStatus(screenings, "pre_screening");
    const active = countByStatus(screenings, "screening");
    const randomized = countByStatus(screenings, "randomized");
    const failures = countByStatus(screenings, "screen_failure");
    const inPipeline = pre + active;
    const conversion =
      pre + active + randomized > 0
        ? pct(randomized, pre + active + randomized)
        : 0;

    return { total, pre, active, randomized, failures, inPipeline, conversion };
  }, [screenings]);

  const recent = useMemo(
    () =>
      [...screenings]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 6),
    [screenings]
  );

  return (
    <>
      <PageHeader
        title="Tablero Central"
        description="El Embudo de Screening — tracker en tiempo real del pipeline de tu clínica."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/tracker">
              <Button variant="secondary">
                <KanbanSquare className="h-4 w-4" aria-hidden />
                Ver Kanban
              </Button>
            </Link>
            <Link href="/rematch">
              <Button>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Re-Match
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6">
        <ProductMetricsKpis
          productMetrics={productMetrics}
          error={productMetricsError}
        />
      </div>

      {loading ? (
        <LoadingState label="Actualizando embudo…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : screenings.length === 0 ? (
        <Card>
          <EmptyState
            title="El embudo está vacío"
            description="Ejecutá matching en un protocolo para poblar el pipeline de screening."
            action={
              <Link href="/protocols" className="text-xs font-medium text-indigo-700">
                Ir a Protocol Matcher →
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total en pipeline"
              value={stats.total}
              hint={`${stats.inPipeline} en curso`}
              icon={Users}
              accent="from-indigo-500 to-violet-600"
            />
            <StatCard
              label="Pre-screening"
              value={stats.pre}
              hint={`${pct(stats.pre, stats.total)}% del total`}
              icon={Filter}
              accent="from-sky-500 to-cyan-500"
            />
            <StatCard
              label="Tasa randomización"
              value={`${stats.conversion}%`}
              hint={`${stats.randomized} randomizados`}
              icon={TrendingUp}
              accent="from-emerald-500 to-teal-500"
            />
            <StatCard
              label="Screen failures"
              value={stats.failures}
              hint="Candidatos a re-match"
              icon={RefreshCw}
              accent="from-rose-500 to-pink-500"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader
                title="El Embudo de Screening"
                description="Flujo en tiempo real por etapa del tracker."
              />
              <CardBody className="space-y-4">
                {SCREENING_STATUS_ORDER.map((status, index) => {
                  const count = countByStatus(screenings, status);
                  const styles = FUNNEL_STYLES[status];
                  const share = pct(count, stats.total);

                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              styles.badge
                            )}
                          >
                            {SCREENING_STATUS_LABELS[status]}
                          </span>
                          {index < SCREENING_STATUS_ORDER.length - 1 ? (
                            <ArrowRight
                              className="hidden h-3.5 w-3.5 text-violet-300 sm:block"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                        <span className="font-semibold tabular-nums text-indigo-950">
                          {count}{" "}
                          <span className="text-xs font-normal text-indigo-500">
                            ({share}%)
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <div
                          className={cn(
                            "h-10 rounded-xl bg-gradient-to-r shadow-sm ring-1 transition-all",
                            styles.bar,
                            styles.ring,
                            styles.width
                          )}
                          title={`${count} pacientes`}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader
                title="Actividad reciente"
                description="Últimos movimientos en el pipeline."
              />
              <CardBody className="space-y-2 p-3">
                {recent.map((screening) => (
                  <Link
                    key={screening.id}
                    href={`/patients/${screening.patient_id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2 transition-colors hover:border-violet-200 hover:bg-violet-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-indigo-950">
                        {screening.patients.last_name},{" "}
                        {screening.patients.first_name}
                      </p>
                      <p className="truncate text-[11px] text-indigo-500">
                        {screening.protocols.code_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] tabular-nums text-indigo-400">
                        {Math.round(Number(screening.match_score))}%
                      </span>
                      <StatusPill status={screening.status} />
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-8">
        <PricingSection />
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardBody className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-indigo-600/80">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-indigo-950">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-400">{hint}</p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            accent
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardBody>
    </Card>
  );
}

function StatusPill({ status }: { status: ScreeningStatus }) {
  const styles = FUNNEL_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        styles.badge
      )}
    >
      <VerdictDot
        verdict={
          status === "randomized"
            ? "eligible"
            : status === "screen_failure"
              ? "excluded"
              : "pending"
        }
      />
      {SCREENING_STATUS_LABELS[status]}
    </span>
  );
}

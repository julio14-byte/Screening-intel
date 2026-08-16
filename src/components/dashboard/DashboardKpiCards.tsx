import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  TrendingDown,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { DashboardMetrics } from "@/lib/dashboard/metrics";

export function DashboardKpiCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="En screening"
        value={metrics.totalInScreening}
        subtitle="Pre-screening y screening activos"
        icon={ClipboardList}
        accent="violet"
        trend={`${metrics.total} registros totales`}
      />
      <KpiCard
        title="Tasa screen-failure"
        value={`${metrics.screenFailureRate}%`}
        subtitle="Proporción de fallos de screening"
        icon={TrendingDown}
        accent="steel"
      />
      <KpiCard
        title="Aptos (verde)"
        value={metrics.eligibleCount}
        subtitle="Semáforo clínico favorable"
        icon={CheckCircle2}
        accent="success"
      />
      <KpiCard
        title="Pendientes (amarillo)"
        value={metrics.pendingCount}
        subtitle="Requieren revisión del coordinador"
        icon={AlertCircle}
        accent="amber"
      />
    </div>
  );
}

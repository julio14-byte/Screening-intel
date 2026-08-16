import { Bot, Mail, Users } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  formatWeekTrend,
  type ProductMetrics,
} from "@/lib/dashboard/productMetrics";

export function ProductMetricsKpis({
  productMetrics,
  error,
}: {
  productMetrics: ProductMetrics | null;
  error: string | null;
}) {
  if (error) {
    return (
      <section aria-label="Métricas de tu producto">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Métricas de tu producto</p>
          <p className="mt-1">
            No pudimos leer waitlist, signups ni chat: {error}. Configura{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> en el
            servidor.
          </p>
        </div>
      </section>
    );
  }

  if (!productMetrics) return null;

  const {
    waitlistTotal,
    waitlistWeek,
    signupsTotal,
    signupsWeek,
    chatSessionsTotal,
    chatSessionsWeek,
  } = productMetrics;

  return (
    <section aria-label="Métricas de tu producto" className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
          Tracción del MVP
        </p>
        <h2 className="text-lg font-bold text-indigo-950 sm:text-xl">
          Métricas reales de tu producto
        </h2>
        <p className="mt-1 text-sm text-indigo-600/70">
          Datos vivos de Supabase para tu pitch: waitlist, registros y sesiones
          de chat IA.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Waitlist"
          value={waitlistTotal}
          subtitle="Personas que pidieron acceso"
          trend={formatWeekTrend(waitlistWeek)}
          icon={Mail}
          accent="amber"
        />
        <KpiCard
          title="Signups del MVP"
          value={signupsTotal}
          subtitle="Usuarios registrados en la app"
          trend={formatWeekTrend(signupsWeek)}
          icon={Users}
          accent="steel"
        />
        <KpiCard
          title="Sesiones de chat IA"
          value={chatSessionsTotal}
          subtitle="Conversaciones guardadas (asistente clínico)"
          trend={formatWeekTrend(chatSessionsWeek)}
          icon={Bot}
          accent="success"
        />
      </div>
    </section>
  );
}

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  ListTodo,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import type { SiteFunnelSnapshot } from "@/lib/dashboard/computeSiteFunnel";
import { routes } from "@/lib/app/routes";
import { cn, formatDate } from "@/lib/utils";

const PENDING_KIND_LABEL: Record<string, string> = {
  overdue_visit: "Visita vencida",
  missing_consent: "ICF",
  missing_criterion: "Dato 🟡",
};

export function SiteFunnelBoard({ snapshot }: { snapshot: SiteFunnelSnapshot }) {
  const empty =
    snapshot.candidatosWeek === 0 &&
    snapshot.preScreening + snapshot.screening + snapshot.randomized === 0 &&
    snapshot.screenFailurePatients === 0 &&
    snapshot.pendingCount === 0;

  return (
    <>
      <PageHeader
        title="Tablero del funnel"
        description={`Últimos ${snapshot.windowDays} días · tiempo a pre-screening y screen failures reasignados. Lo que el PI lleva a la reunión de enrollment.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={routes.app.semaforos}>
              <Button variant="secondary">Semáforos</Button>
            </Link>
            <Link href={routes.app.pendientes}>
              <Button variant="secondary">Pendientes</Button>
            </Link>
            <Link href={routes.app.rematch}>
              <Button>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Re-Match
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Candidatos"
          value={snapshot.candidatosWeek}
          subtitle={`${snapshot.candidatosPending} por contactar`}
          trend={`${snapshot.convertedWeek} ya en expediente`}
          icon={UserPlus}
          accent="violet"
        />
        <KpiCard
          title="% a visita"
          value={`${snapshot.visitRatePct}%`}
          subtitle={`${snapshot.withVisitWeek} de ${snapshot.convertedWeek} convertidos`}
          trend={`${snapshot.visitsCompletedWeek} hechas · ${snapshot.visitsNoShowWeek} no show`}
          icon={CalendarDays}
          accent="steel"
        />
        <KpiCard
          title="Tiempo a pre-screening"
          value={snapshot.timeToPreScreenLabel}
          subtitle="Mediana del alta al primer matching"
          icon={Clock3}
          accent="amber"
        />
        <KpiCard
          title="Failures reasignados"
          value={`${snapshot.reassignRatePct}%`}
          subtitle={`${snapshot.reassignedPatients} de ${snapshot.screenFailurePatients} screen failures`}
          trend={
            snapshot.waitingRematch.length
              ? `${snapshot.waitingRematch.length} aún sin otro protocolo`
              : "Nadie en cola de re-match"
          }
          icon={RefreshCw}
          accent="success"
        />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Embudo de enrollment"
            description="Del portal a randomización. Screen failure sale del tubo y vuelve por Re-Match."
          />
          <CardBody>
            <ol className="grid gap-2 sm:grid-cols-5">
              {snapshot.steps.map((step, index) => (
                <li key={step.id} className="relative">
                  <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
                      {index + 1}. {step.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">
                      {step.count}
                    </p>
                    <p className="mt-0.5 text-[11px] text-indigo-400">{step.hint}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-indigo-500">
              Pipeline ahora: {snapshot.preScreening} pre-screening · {snapshot.screening}{" "}
              screening · {snapshot.randomized} randomizados · {snapshot.screenFailurePatients}{" "}
              pacientes en screen failure.
            </p>
          </CardBody>
        </Card>
      </div>

      {empty ? (
        <Card className="mt-5">
          <CardBody className="py-8 text-center">
            <p className="text-sm font-medium text-indigo-950">Aún no hay movimiento esta semana</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-indigo-500">
              El tablero se llena con el portal de candidatos, visitas en Agenda y matching en
              protocolos. Los ceros son reales, no un error.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={routes.app.candidatos}>
                <Button variant="secondary">Inbox de candidatos</Button>
              </Link>
              <Link href={routes.app.agenda}>
                <Button variant="secondary">Agenda</Button>
              </Link>
              <Link href={routes.app.protocols}>
                <Button>Ir a protocolos</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Atención ahora"
              description={`${snapshot.pendingCount} pendientes · visitas vencidas, ICF y criterios 🟡`}
              actions={
                <Link
                  href={routes.app.pendientes}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  Ver cola
                </Link>
              }
            />
            <CardBody className="space-y-2 p-3">
              {snapshot.pendingItems.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-indigo-500">
                  Nada vencido. El coordinador está al día.
                </p>
              ) : (
                snapshot.pendingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-violet-100 bg-white/80 px-3 py-2 hover:border-violet-200 hover:bg-violet-50/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-indigo-950">
                        {item.patientName}
                      </p>
                      <p className="truncate text-[11px] text-indigo-500">{item.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      {PENDING_KIND_LABEL[item.kind] ?? item.kind}
                    </span>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Screen failures sin reasignar"
              description="Cayeron de un protocolo y todavía no tienen otro activo."
              actions={
                <Link
                  href={routes.app.rematch}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  Abrir Re-Match
                </Link>
              }
            />
            <CardBody className="space-y-2 p-3">
              {snapshot.waitingRematch.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-indigo-500">
                  {snapshot.screenFailurePatients === 0
                    ? "No hay screen failures."
                    : "Todos los screen failures ya tienen otro protocolo."}
                </p>
              ) : (
                snapshot.waitingRematch.map((person) => (
                  <Link
                    key={person.patientId}
                    href={person.href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-white/80 px-3 py-2 hover:border-rose-200 hover:bg-rose-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-indigo-950">
                        {person.name}
                      </p>
                      <p className="truncate text-[11px] text-rose-600/80">
                        Falló {person.protocolCode}
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-indigo-400">
        <span className={cn("inline-flex items-center gap-1")}>
          <ListTodo className="h-3.5 w-3.5" aria-hidden />
          Ventana desde {formatDate(snapshot.sinceIso)}
        </span>
        <span>
          Visitas 7d: {snapshot.visitsScheduledWeek} programadas · {snapshot.visitsCompletedWeek}{" "}
          hechas
        </span>
      </p>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Search } from "lucide-react";
import { MorningList } from "@/components/citas/MorningList";
import { NewVisitModal, RescheduleModal } from "@/components/citas/NewVisitModal";
import { VisitCard } from "@/components/citas/VisitCard";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { usePatients } from "@/hooks/usePatients";
import { usePatientsWithProfiles } from "@/hooks/usePatientsWithProfiles";
import { useProtocols } from "@/hooks/useProtocols";
import { useVisits } from "@/hooks/useVisits";
import { buildMorningList } from "@/lib/matching/morning-list";
import {
  addDays,
  dayKey,
  formatDayHeading,
  groupByDay,
  isOverdue,
  patientLabel,
  startOfDay,
  type VisitRow,
} from "@/lib/ops/visits";
import { normalizeTerm } from "@/lib/utils";

type View = "proximas" | "hoy" | "por_cerrar" | "historial";

const VIEW_LABEL: Record<View, string> = {
  hoy: "Hoy",
  proximas: "Próximas",
  por_cerrar: "Por cerrar",
  historial: "Historial",
};

export function CitasBoard() {
  const { isReadOnly } = useRole();
  const { patients } = usePatients();
  const { pairs, loading: profilesLoading, error: profilesError } = usePatientsWithProfiles();
  const { protocols, loading: protocolsLoading, error: protocolsError } = useProtocols();
  const { visits, loading, error, setError, createVisit, patchVisit } = useVisits();
  const [view, setView] = useState<View>("proximas");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<VisitRow | null>(null);

  const counts = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    let today = 0;
    let upcoming = 0;
    let pending = 0;
    for (const visit of visits) {
      const at = new Date(visit.scheduled_at);
      if (visit.status !== "scheduled") continue;
      if (isOverdue(visit, now)) pending += 1;
      else if (at >= todayStart && at < tomorrowStart) today += 1;
      if (at >= todayStart) upcoming += 1;
    }
    return { today, upcoming, pending };
  }, [visits]);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const term = normalizeTerm(search);
    const list = visits.filter((visit) => {
      if (term) {
        const haystack = normalizeTerm(
          `${patientLabel(visit.patient)} ${visit.patient?.subject_code ?? ""} ${
            visit.protocol_code ?? ""
          } ${visit.location} ${visit.clinician_name}`
        );
        if (!haystack.includes(term)) return false;
      }
      const at = new Date(visit.scheduled_at);
      switch (view) {
        case "hoy":
          return at >= todayStart && at < tomorrowStart && visit.status !== "cancelled";
        case "proximas":
          return visit.status === "scheduled" && at >= todayStart;
        case "por_cerrar":
          return isOverdue(visit, now);
        case "historial":
          return visit.status !== "scheduled" || at < todayStart;
      }
    });
    return view === "historial" ? [...list].reverse() : list;
  }, [visits, view, search]);

  const groups = useMemo(() => {
    const grouped = groupByDay(filtered);
    return view === "historial" ? grouped.reverse() : grouped;
  }, [filtered, view]);

  const morningReady = !loading && !profilesLoading && !protocolsLoading;
  const morningBlocked = profilesError
    ? "No se pudo leer la ficha clínica para armar la lista de la mañana."
    : protocolsError
      ? "No se pudieron leer los protocolos activos."
      : null;
  const morning = useMemo(() => {
    if (!morningReady || morningBlocked) return [];
    return buildMorningList({ visits, pairs, protocols, now: new Date() });
  }, [morningReady, morningBlocked, visits, pairs, protocols]);

  return (
    <>
      <PageHeader
        title="Citas"
        actions={
          isReadOnly ? null : (
            <Button onClick={() => setCreating(true)}>
              <CalendarPlus className="h-4 w-4" aria-hidden /> Agendar cita
            </Button>
          )
        }
      />

      {error ? (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-xl">
        <Stat label="Hoy" value={counts.today} onClick={() => setView("hoy")} />
        <Stat label="Próximas" value={counts.upcoming} onClick={() => setView("proximas")} />
        <Stat
          label="Por cerrar"
          value={counts.pending}
          tone={counts.pending > 0 ? "warn" : "default"}
          onClick={() => setView("por_cerrar")}
        />
      </div>

      <MorningList items={morning} loading={!morningReady} blocked={morningBlocked} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="flex flex-wrap gap-1">
          {(Object.keys(VIEW_LABEL) as View[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                view === key
                  ? "bg-violet-600 text-white"
                  : "bg-white text-indigo-800 ring-1 ring-violet-200 hover:bg-violet-50"
              }`}
            >
              {VIEW_LABEL[key]}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-violet-400"
            aria-hidden
          />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente, sede…"
            className="pl-8"
            aria-label="Buscar citas"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState label="Cargando citas…" />
      ) : groups.length === 0 ? (
        <EmptyState
          title={emptyTitle(view, search)}
          action={
            isReadOnly || view === "por_cerrar" ? null : (
              <Button onClick={() => setCreating(true)}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> Agendar cita
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([key, items]) => (
            <section key={key} aria-label={formatDayHeading(key)}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
                {formatDayHeading(key)}
                <span className="ml-2 font-normal normal-case text-slate-400">
                  {items.length} {items.length === 1 ? "cita" : "citas"}
                </span>
              </h2>
              <ul className="space-y-2">
                {items.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    readOnly={isReadOnly}
                    showDate={view === "por_cerrar"}
                    onPatch={patchVisit}
                    onReschedule={setRescheduling}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <NewVisitModal
        open={creating}
        onClose={() => setCreating(false)}
        patients={patients}
        protocols={protocols}
        visits={visits}
        presetDate={dayKey(new Date())}
        onCreate={createVisit}
      />
      <RescheduleModal
        visit={rescheduling}
        onClose={() => setRescheduling(null)}
        onSave={async (id, scheduledAt) => {
          setError(null);
          await patchVisit(id, { scheduled_at: scheduledAt });
        }}
      />
    </>
  );
}

function emptyTitle(view: View, search: string): string {
  if (search.trim()) return "Ninguna cita coincide con la búsqueda";
  switch (view) {
    case "hoy":
      return "No hay citas hoy";
    case "por_cerrar":
      return "Todo al día: no hay citas por cerrar";
    case "historial":
      return "Sin historial todavía";
    default:
      return "No hay citas próximas";
  }
}

function Stat({
  label,
  value,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition-colors hover:bg-violet-50 ${
        tone === "warn"
          ? "border-amber-200 bg-amber-50"
          : "border-violet-100 bg-white"
      }`}
    >
      <p className="text-2xl font-semibold text-indigo-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  );
}

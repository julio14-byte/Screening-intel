import type { PendingItem, ScreeningStatus, VisitStatus } from "@/lib/types";

export const FUNNEL_WINDOW_DAYS = 7;

export type FunnelSubmission = {
  id: string;
  status: string;
  created_at: string;
  converted_patient_id: string | null;
  first_name: string;
  last_name: string;
};

export type FunnelVisit = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: VisitStatus;
  visit_type: string;
};

export type FunnelScreening = {
  id: string;
  patient_id: string;
  protocol_id: string;
  status: ScreeningStatus;
  created_at: string;
  patientCreatedAt: string | null;
  patientName: string;
  protocolCode: string;
};

export type FunnelStep = {
  id: string;
  label: string;
  count: number;
  hint: string;
};

export type FunnelPerson = {
  patientId: string;
  name: string;
  protocolCode: string;
  href: string;
};

export type SiteFunnelSnapshot = {
  windowDays: number;
  sinceIso: string;
  candidatosWeek: number;
  candidatosPending: number;
  convertedWeek: number;
  withVisitWeek: number;
  visitRatePct: number;
  visitsScheduledWeek: number;
  visitsCompletedWeek: number;
  visitsNoShowWeek: number;
  medianHoursToPreScreen: number | null;
  timeToPreScreenLabel: string;
  preScreening: number;
  screening: number;
  randomized: number;
  screenFailurePatients: number;
  reassignedPatients: number;
  reassignRatePct: number;
  waitingRematch: FunnelPerson[];
  pendingItems: PendingItem[];
  pendingCount: number;
  steps: FunnelStep[];
};

function inWindow(iso: string, sinceMs: number): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= sinceMs;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatDurationHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "Sin datos";
  if (hours < 1) return "< 1 h";
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = hours / 24;
  if (days < 10) return `${days.toFixed(1)} días`;
  return `${Math.round(days)} días`;
}

export function computeSiteFunnel(input: {
  now?: Date;
  windowDays?: number;
  submissions: FunnelSubmission[];
  visits: FunnelVisit[];
  screenings: FunnelScreening[];
  pendingItems: PendingItem[];
}): SiteFunnelSnapshot {
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? FUNNEL_WINDOW_DAYS;
  const sinceMs = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const submissionsWeek = input.submissions.filter(
    (row) => row.status !== "archived" && inWindow(row.created_at, sinceMs)
  );
  const candidatosWeek = submissionsWeek.length;
  const candidatosPending = submissionsWeek.filter(
    (row) => row.status === "pending"
  ).length;
  const convertedWeek = submissionsWeek.filter(
    (row) => Boolean(row.converted_patient_id) || row.status === "converted"
  );
  const convertedIds = new Set(
    convertedWeek
      .map((row) => row.converted_patient_id)
      .filter((id): id is string => Boolean(id))
  );

  const activeVisit = (visit: FunnelVisit) =>
    visit.status === "scheduled" || visit.status === "completed";

  const visitsWeek = input.visits.filter((visit) =>
    inWindow(visit.scheduled_at, sinceMs)
  );
  const visitedConverted = new Set(
    visitsWeek
      .filter((visit) => activeVisit(visit) && convertedIds.has(visit.patient_id))
      .map((visit) => visit.patient_id)
  );
  const withVisitWeek = visitedConverted.size;
  const visitRatePct =
    convertedWeek.length === 0
      ? 0
      : Math.round((withVisitWeek / convertedWeek.length) * 100);

  const preScreening = input.screenings.filter(
    (row) => row.status === "pre_screening"
  ).length;
  const screening = input.screenings.filter(
    (row) => row.status === "screening"
  ).length;
  const randomized = input.screenings.filter(
    (row) => row.status === "randomized"
  ).length;

  const firstScreeningByPatient = new Map<string, FunnelScreening>();
  for (const row of input.screenings) {
    const prev = firstScreeningByPatient.get(row.patient_id);
    if (!prev || new Date(row.created_at).getTime() < new Date(prev.created_at).getTime()) {
      firstScreeningByPatient.set(row.patient_id, row);
    }
  }

  const hoursToPre: number[] = [];
  for (const row of firstScreeningByPatient.values()) {
    if (!row.patientCreatedAt) continue;
    const start = new Date(row.patientCreatedAt).getTime();
    const end = new Date(row.created_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    hoursToPre.push((end - start) / (1000 * 60 * 60));
  }
  const medianHoursToPreScreen = median(hoursToPre);

  const failedByPatient = new Map<string, Set<string>>();
  for (const row of input.screenings) {
    if (row.status !== "screen_failure") continue;
    const set = failedByPatient.get(row.patient_id) ?? new Set<string>();
    set.add(row.protocol_id);
    failedByPatient.set(row.patient_id, set);
  }

  const reassigned = new Set<string>();
  for (const row of input.screenings) {
    const failedProtocols = failedByPatient.get(row.patient_id);
    if (!failedProtocols) continue;
    if (failedProtocols.has(row.protocol_id)) continue;
    if (
      row.status === "pre_screening" ||
      row.status === "screening" ||
      row.status === "randomized"
    ) {
      reassigned.add(row.patient_id);
    }
  }

  const waitingRematch: FunnelPerson[] = [];
  const seenWait = new Set<string>();
  for (const row of input.screenings) {
    if (row.status !== "screen_failure") continue;
    if (reassigned.has(row.patient_id) || seenWait.has(row.patient_id)) continue;
    seenWait.add(row.patient_id);
    waitingRematch.push({
      patientId: row.patient_id,
      name: row.patientName,
      protocolCode: row.protocolCode,
      href: `/rematch`,
    });
  }

  const screenFailurePatients = failedByPatient.size;
  const reassignedPatients = reassigned.size;
  const reassignRatePct =
    screenFailurePatients === 0
      ? 0
      : Math.round((reassignedPatients / screenFailurePatients) * 100);

  const steps: FunnelStep[] = [
    {
      id: "candidatos",
      label: "Candidatos",
      count: candidatosWeek,
      hint: "Portal, 7 días",
    },
    {
      id: "convertidos",
      label: "En expediente",
      count: convertedWeek.length,
      hint: "Convertidos a paciente",
    },
    {
      id: "visita",
      label: "Con visita",
      count: withVisitWeek,
      hint: "Agendada o hecha",
    },
    {
      id: "pre",
      label: "Pre-screening",
      count: preScreening,
      hint: "Ahora en pipeline",
    },
    {
      id: "rnd",
      label: "Randomizados",
      count: randomized,
      hint: "Cierre del funnel",
    },
  ];

  return {
    windowDays,
    sinceIso,
    candidatosWeek,
    candidatosPending,
    convertedWeek: convertedWeek.length,
    withVisitWeek,
    visitRatePct,
    visitsScheduledWeek: visitsWeek.filter((v) => v.status === "scheduled").length,
    visitsCompletedWeek: visitsWeek.filter((v) => v.status === "completed").length,
    visitsNoShowWeek: visitsWeek.filter((v) => v.status === "no_show").length,
    medianHoursToPreScreen,
    timeToPreScreenLabel: formatDurationHours(medianHoursToPreScreen),
    preScreening,
    screening,
    randomized,
    screenFailurePatients,
    reassignedPatients,
    reassignRatePct,
    waitingRematch: waitingRematch.slice(0, 6),
    pendingItems: input.pendingItems.slice(0, 8),
    pendingCount: input.pendingItems.length,
    steps,
  };
}

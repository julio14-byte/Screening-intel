export const TASK_KINDS = ["inbox", "yellow", "rematch"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const VISIT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_KINDS = [
  "consulta",
  "pre_screening",
  "screening",
  "follow_up",
] as const;
export type VisitKind = (typeof VISIT_KINDS)[number];

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: "Programada",
  completed: "Hecha",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const VISIT_KIND_LABEL: Record<VisitKind, string> = {
  consulta: "Consulta médica",
  pre_screening: "Pre-screening",
  screening: "Screening",
  follow_up: "Seguimiento",
};

export const VISIT_NOTES_MAX = 8000;

export const NOTIFICATION_KINDS = [
  "inbox_new",
  "screen_failure",
  "task_overdue",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const DUE_DAYS: Record<TaskKind, number> = {
  inbox: 1,
  yellow: 2,
  rematch: 3,
};

export function dueAtForKind(kind: TaskKind, from = new Date()): string {
  const due = new Date(from.getTime());
  due.setUTCDate(due.getUTCDate() + DUE_DAYS[kind]);
  return due.toISOString();
}

export function openTaskKey(kind: string, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

/** El screening se movió si el update condicionado no devolvió filas. */
export function screeningUpdateConflict(rowCount: number): boolean {
  return rowCount === 0;
}

export type FunnelCounts = {
  capture: number;
  preScreening: number;
  screening: number;
  randomized: number;
  recover: number;
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  href: string;
};

export function buildOperationalFunnel(counts: FunnelCounts): {
  stages: FunnelStage[];
  recover: FunnelStage;
} {
  return {
    stages: [
      {
        key: "capture",
        label: "Inbox del portal",
        count: counts.capture,
        href: "/candidatos",
      },
      {
        key: "pre_screening",
        label: "Pre-screening",
        count: counts.preScreening,
        href: "/tracker",
      },
      {
        key: "screening",
        label: "Screening",
        count: counts.screening,
        href: "/tracker",
      },
      {
        key: "randomized",
        label: "Randomizado",
        count: counts.randomized,
        href: "/tracker",
      },
    ],
    recover: {
      key: "recover",
      label: "A recuperar",
      count: counts.recover,
      href: "/rematch",
    },
  };
}

export function overdueDedupeKey(taskId: string, now = new Date()): string {
  return `overdue:${taskId}:${now.toISOString().slice(0, 10)}`;
}

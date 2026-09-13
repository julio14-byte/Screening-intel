import type { VisitStatus, VisitType } from "@/lib/types";

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  pre_screening: "Pre-screening",
  consent: "Consentimiento informado",
  labs: "Laboratorios",
  screening: "Visita de screening",
  randomization: "Randomización",
  other: "Otra",
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  no_show: "No se presentó",
  cancelled: "Cancelada",
};

export const VISIT_TYPES = [
  "pre_screening",
  "consent",
  "labs",
  "screening",
  "randomization",
  "other",
] as const satisfies readonly VisitType[];

export const VISIT_STATUSES = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
] as const satisfies readonly VisitStatus[];

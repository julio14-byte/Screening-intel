/** Calendario de visitas de seguimiento según protocolo (no es la agenda de consultas). */

export const FOLLOW_UP_STATUSES = [
  "scheduled",
  "completed",
  "out_of_window",
  "missed",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_STATUS_LABEL: Record<FollowUpStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  out_of_window: "Fuera de ventana (desviación)",
  missed: "Perdida",
};

export const FOLLOW_UP_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20260925030000_follow_up_visits.sql y recargar el schema.";

export function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida.");
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function visitWindow(input: {
  baselineOn: string;
  targetDay: number;
  windowBeforeDays: number;
  windowAfterDays: number;
}): { targetOn: string; windowStartOn: string; windowEndOn: string } {
  const targetOn = addUtcDays(input.baselineOn, input.targetDay);
  return {
    targetOn,
    windowStartOn: addUtcDays(targetOn, -input.windowBeforeDays),
    windowEndOn: addUtcDays(targetOn, input.windowAfterDays),
  };
}

export function isDateInWindow(
  actualOn: string,
  windowStartOn: string,
  windowEndOn: string
): boolean {
  const actual = actualOn.slice(0, 10);
  return actual >= windowStartOn && actual <= windowEndOn;
}

export function statusAfterActualDate(
  actualOn: string,
  windowStartOn: string,
  windowEndOn: string
): { status: Extract<FollowUpStatus, "completed" | "out_of_window">; protocolDeviation: boolean } {
  if (isDateInWindow(actualOn, windowStartOn, windowEndOn)) {
    return { status: "completed", protocolDeviation: false };
  }
  return { status: "out_of_window", protocolDeviation: true };
}

/** Adherencia = (entregadas − devueltas) / entregadas. */
export function adherencePercent(
  pillsDispensed: number,
  pillsReturned: number
): number | null {
  if (!Number.isFinite(pillsDispensed) || pillsDispensed <= 0) return null;
  if (!Number.isFinite(pillsReturned) || pillsReturned < 0) return null;
  if (pillsReturned > pillsDispensed) return null;
  return Math.round(((pillsDispensed - pillsReturned) / pillsDispensed) * 1000) / 10;
}

export function reimbursementTotal(
  transportAmount: number,
  mealsAmount: number
): number {
  const transport = Number.isFinite(transportAmount) ? transportAmount : 0;
  const meals = Number.isFinite(mealsAmount) ? mealsAmount : 0;
  return Math.round((transport + meals) * 100) / 100;
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isWindowOverdue(windowEndOn: string, today = utcToday()): boolean {
  return today > windowEndOn;
}

export function isMissingFollowUpSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentions =
    /protocol_visit_schedules|follow_up_visits|protocol_deviation/i.test(message);
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(message);
  return mentions && missing;
}

export type ProtocolVisitSchedule = {
  id: string;
  protocol_id: string;
  arm_id: string | null;
  visit_code: string;
  title: string;
  target_day: number;
  window_before_days: number;
  window_after_days: number;
  sort_order: number;
  active: boolean;
};

export type FollowUpVisit = {
  id: string;
  patient_id: string;
  protocol_id: string;
  arm_id: string | null;
  schedule_id: string;
  baseline_on: string;
  target_on: string;
  window_start_on: string;
  window_end_on: string;
  scheduled_on: string;
  actual_on: string | null;
  status: FollowUpStatus;
  protocol_deviation: boolean;
  pills_dispensed: number | null;
  pills_returned: number | null;
  adherence_pct: number | null;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  adverse_event: boolean;
  adverse_event_notes: string;
  transport_amount: number;
  meals_amount: number;
  currency: string;
  notes: string;
  overdue?: boolean;
};

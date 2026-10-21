import { z } from "zod";
import type { ScreeningStatus } from "@/lib/types";

export const ENROLLMENT_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021080000_enrollment_targets.sql en Supabase.";

export const ENROLLMENT_TARGET_COLUMNS =
  "protocol_id, target_randomized, start_date, end_date";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

export const enrollmentTargetSchema = z
  .object({
    protocol_id: z.string().uuid("Protocolo inválido."),
    target_randomized: z
      .number({ error: "La meta debe ser un número." })
      .int("La meta debe ser un número entero.")
      .min(1, "La meta debe ser al menos 1.")
      .max(100000, "La meta es demasiado alta."),
    start_date: isoDate.nullable(),
    end_date: isoDate.nullable(),
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { message: "La fecha de cierre no puede ser anterior al inicio.", path: ["end_date"] }
  );

export type EnrollmentTarget = z.infer<typeof enrollmentTargetSchema>;

export type EnrollmentPace =
  | "complete"
  | "on_track"
  | "behind"
  | "at_risk"
  | "overdue"
  | "not_started"
  | "no_window";

export const PACE_LABELS: Record<EnrollmentPace, string> = {
  complete: "Meta cumplida",
  on_track: "En ritmo",
  behind: "Atrasado",
  at_risk: "En riesgo",
  overdue: "Ventana vencida",
  not_started: "Aún no inicia",
  no_window: "Sin ventana",
};

export interface EnrollmentProgress {
  protocolId: string;
  target: number;
  randomized: number;
  screenFailures: number;
  inScreening: number;
  inPreScreening: number;
  percent: number;
  pace: EnrollmentPace;
  daysTotal: number | null;
  daysElapsed: number | null;
  daysLeft: number | null;
  expectedByNow: number | null;
  /** Fracción de screenings cerrados que terminó randomizada; `null` con muy pocos casos. */
  conversion: number | null;
  /** Randomizados que faltan para la meta. */
  remaining: number;
  /** Sujetos que aún hay que sumar a screening para llegar a la meta, descontando los que ya van. */
  neededInScreening: number | null;
  /** Fecha estimada de cierre al ritmo actual (AAAA-MM-DD); `null` si no hay ritmo. */
  projectedFinish: string | null;
}

export interface EnrollmentScreeningRow {
  protocol_id: string;
  status: ScreeningStatus;
}

const MS_DAY = 86_400_000;
const MIN_CLOSED_FOR_CONVERSION = 3;

const toUtcDay = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function buildEnrollmentProgress(
  targets: Pick<EnrollmentTarget, "protocol_id" | "target_randomized" | "start_date" | "end_date">[],
  screenings: EnrollmentScreeningRow[],
  today: Date = new Date()
): EnrollmentProgress[] {
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return targets.map((t) => {
    const mine = screenings.filter((s) => s.protocol_id === t.protocol_id);
    const count = (s: ScreeningStatus) => mine.filter((r) => r.status === s).length;
    const randomized = count("randomized");
    const screenFailures = count("screen_failure");
    const inScreening = count("screening");
    const inPreScreening = count("pre_screening");
    const target = t.target_randomized;
    const remaining = Math.max(0, target - randomized);
    const percent = Math.min(100, Math.round((randomized / target) * 100));

    const startMs = t.start_date ? toUtcDay(t.start_date) : null;
    const endMs = t.end_date ? toUtcDay(t.end_date) : null;
    const hasWindow = startMs !== null && endMs !== null;
    const daysTotal = hasWindow ? Math.round((endMs - startMs) / MS_DAY) + 1 : null;
    const daysElapsed = hasWindow
      ? Math.max(0, Math.min(daysTotal!, Math.round((todayMs - startMs) / MS_DAY) + 1))
      : null;
    const daysLeft = hasWindow ? Math.max(0, Math.round((endMs - todayMs) / MS_DAY)) : null;
    const expectedByNow =
      hasWindow && daysTotal ? (target * daysElapsed!) / daysTotal : null;

    let pace: EnrollmentPace;
    if (randomized >= target) pace = "complete";
    else if (!hasWindow) pace = "no_window";
    else if (todayMs < startMs!) pace = "not_started";
    else if (todayMs > endMs!) pace = "overdue";
    else if (expectedByNow! < 2) pace = "on_track";
    else {
      const ratio = randomized / expectedByNow!;
      pace = ratio >= 0.9 ? "on_track" : ratio >= 0.6 ? "behind" : "at_risk";
    }

    const closed = randomized + screenFailures;
    const conversion = closed >= MIN_CLOSED_FOR_CONVERSION ? randomized / closed : null;
    const neededInScreening =
      remaining === 0
        ? 0
        : conversion && conversion > 0
          ? Math.max(0, Math.ceil(remaining / conversion) - inScreening)
          : null;

    let projectedFinish: string | null = null;
    if (remaining === 0) {
      projectedFinish = null;
    } else if (hasWindow && randomized > 0 && daysElapsed! > 0 && todayMs >= startMs!) {
      const perDay = randomized / daysElapsed!;
      projectedFinish = isoDay(todayMs + Math.ceil(remaining / perDay) * MS_DAY);
    }

    return {
      protocolId: t.protocol_id,
      target,
      randomized,
      screenFailures,
      inScreening,
      inPreScreening,
      percent,
      pace,
      daysTotal,
      daysElapsed,
      daysLeft,
      expectedByNow: expectedByNow === null ? null : Math.round(expectedByNow * 10) / 10,
      conversion: conversion === null ? null : Math.round(conversion * 100) / 100,
      remaining,
      neededInScreening,
      projectedFinish,
    };
  });
}

export function isPaceAlert(pace: EnrollmentPace): boolean {
  return pace === "behind" || pace === "at_risk" || pace === "overdue";
}

import type { CriterionResult, MatchResult } from "@/lib/types";

export interface FeasibilityCriterion {
  criterion: string;
  type: "inclusion" | "exclusion";
  pass: number;
  fail: number;
  missing: number;
}

export interface FeasibilityReportData {
  evaluated: number;
  eligible: number;
  pending: number;
  excluded: number;
  criteriaDefined: boolean;
  criteria: FeasibilityCriterion[];
  /** Criterio con más pacientes en "no se cumple". */
  topExcluding: FeasibilityCriterion | null;
  /** Criterio con más pacientes en "requiere información". */
  topMissing: FeasibilityCriterion | null;
}

function criterionKey(detail: CriterionResult): string {
  return `${detail.type}\u0000${detail.criterion}`;
}

/**
 * Conteos para mandar al patrocinador. Solo usa el veredicto y el nombre del
 * criterio del protocolo. No copia nombres, notas ni evidencia del expediente.
 */
export function buildFeasibilityReport(
  results: MatchResult[]
): FeasibilityReportData {
  const eligible = results.filter((result) => result.verdict === "eligible").length;
  const pending = results.filter((result) => result.verdict === "pending").length;
  const excluded = results.filter((result) => result.verdict === "excluded").length;

  const byCriterion = new Map<string, FeasibilityCriterion>();
  for (const result of results) {
    for (const detail of result.details) {
      const key = criterionKey(detail);
      const row = byCriterion.get(key) ?? {
        criterion: detail.criterion,
        type: detail.type,
        pass: 0,
        fail: 0,
        missing: 0,
      };
      row[detail.status] += 1;
      byCriterion.set(key, row);
    }
  }

  const criteria = [...byCriterion.values()].sort(
    (a, b) => b.fail - a.fail || b.missing - a.missing || a.criterion.localeCompare(b.criterion)
  );

  const topExcluding = criteria.find((row) => row.fail > 0) ?? null;
  const topMissing =
    [...criteria].sort(
      (a, b) => b.missing - a.missing || b.fail - a.fail || a.criterion.localeCompare(b.criterion)
    ).find((row) => row.missing > 0) ?? null;

  return {
    evaluated: results.length,
    eligible,
    pending,
    excluded,
    criteriaDefined: criteria.length > 0,
    criteria,
    topExcluding,
    topMissing,
  };
}

export function feasibilityPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export const CHART_WINDOW_MONTHS = [6, 12, 24] as const;
export type ChartWindowMonths = (typeof CHART_WINDOW_MONTHS)[number];

export type CohortChoice =
  | { kind: "registry" }
  | { kind: "chart_window"; months: ChartWindowMonths };

/** Fecha local AAAA-MM-DD. La cohorte se arma con el calendario del centro, no en UTC. */
export function localIsoDate(today: Date): string {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const name = MONTHS[(month ?? 1) - 1] ?? "";
  return `${day} de ${name} de ${year}`;
}

/** Día de inicio de una ventana de N meses, con el día recortado al mes destino. */
export function monthsBefore(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const target = new Date(year, month - 1 - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return localIsoDate(target);
}

export interface CohortRow {
  registeredOn: string;
  chartUpdatedOn: string | null;
}

export interface CohortFilter<T> {
  kept: T[];
  leftOut: number;
  from: string | null;
  to: string;
  label: string;
}

function dayOf(value: string | null): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * Registro completo, o solo expedientes actualizados dentro de la ventana.
 * Un expediente sin fecha, o más viejo que la ventana, queda fuera.
 */
export function applyCohort<T extends CohortRow>(
  rows: T[],
  choice: CohortChoice,
  today: Date
): CohortFilter<T> {
  const to = localIsoDate(today);
  if (choice.kind === "registry") {
    return {
      kept: rows,
      leftOut: 0,
      from: null,
      to,
      label: `los ${rows.length} pacientes del registro de este centro al ${formatLongDate(to)}. Incluye a quienes no tienen expediente cargado.`,
    };
  }

  const from = monthsBefore(to, choice.months);
  const kept = rows.filter((row) => {
    const updated = dayOf(row.chartUpdatedOn);
    return updated != null && updated >= from && updated <= to;
  });
  const leftOut = rows.length - kept.length;
  return {
    kept,
    leftOut,
    from,
    to,
    label: `pacientes con expediente actualizado entre el ${formatLongDate(from)} y el ${formatLongDate(to)} (últimos ${choice.months} meses). ${leftOut} quedaron fuera por no tener expediente o por tenerlo anterior a esa ventana.`,
  };
}

export function sponsorFeasibilityLetter(input: {
  siteName: string | null;
  protocolCode: string;
  protocolTitle: string;
  preparedOn: string;
  cohortLabel: string;
  report: FeasibilityReportData;
}): string {
  const lines = [
    "Factibilidad del centro antes de aceptar el estudio",
    `Protocolo ${input.protocolCode} — ${input.protocolTitle}`,
    `Preparada el ${formatLongDate(input.preparedOn)}.`,
  ];
  if (input.siteName) lines.push(`Centro: ${input.siteName}.`);
  lines.push("", `Cohorte: ${input.cohortLabel}`);

  if (!input.report.criteriaDefined) {
    lines.push(
      "",
      "El protocolo no tiene criterios cargados. Sin criterios no hay un conteo que mandar."
    );
  } else if (input.report.evaluated === 0) {
    lines.push("", "La cohorte no tiene pacientes. No hay un conteo que mandar al patrocinador.");
  } else {
    const total = input.report.evaluated;
    const share = (value: number) => `${value} (${feasibilityPercent(value, total)}%)`;
    lines.push(
      "",
      `Parecen cumplir: ${share(input.report.eligible)}.`,
      `Pendientes de un dato: ${share(input.report.pending)}.`,
      `No cumplen: ${share(input.report.excluded)}.`
    );
    lines.push(
      "",
      input.report.topExcluding
        ? `El criterio que más deja afuera es «${input.report.topExcluding.criterion}»: ${input.report.topExcluding.fail} de ${total}.`
        : "Ningún criterio dejó pacientes afuera."
    );
    lines.push(
      input.report.topMissing
        ? `El criterio que más pide información es «${input.report.topMissing.criterion}»: ${input.report.topMissing.missing} de ${total}.`
        : "Ningún criterio quedó sin información."
    );
  }

  lines.push(
    "",
    "Estos conteos salen del registro interno del centro. No incluyen nombres, fechas de nacimiento ni valores del expediente. Sirven para decidir si el centro acepta el estudio."
  );
  return lines.join("\n");
}

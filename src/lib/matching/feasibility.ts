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

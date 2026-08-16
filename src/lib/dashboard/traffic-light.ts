import type {
  CriterionResult,
  MatchVerdict,
  ScreeningWithRelations,
} from "@/lib/types";

/** Deriva el semáforo clínico desde el screening y sus criterios de matching. */
export function screeningToVerdict(
  screening: ScreeningWithRelations
): MatchVerdict {
  if (screening.status === "screen_failure") return "excluded";
  if (screening.status === "randomized") return "eligible";

  const details = (screening.match_details ?? []) as CriterionResult[];
  const hasExclusionTriggered = details.some(
    (d) => d.type === "exclusion" && d.status === "fail"
  );
  const hasInclusionFail = details.some(
    (d) => d.type === "inclusion" && d.status === "fail"
  );
  const hasMissing = details.some((d) => d.status === "missing");

  if (hasExclusionTriggered || hasInclusionFail) return "excluded";
  if (
    hasMissing ||
    details.length === 0 ||
    screening.status === "pre_screening"
  ) {
    return "pending";
  }

  return "eligible";
}

export const TRAFFIC_LIGHT_LABELS: Record<MatchVerdict, string> = {
  eligible: "Apto (verde)",
  pending: "Pendiente (amarillo)",
  excluded: "No apto (rojo)",
};

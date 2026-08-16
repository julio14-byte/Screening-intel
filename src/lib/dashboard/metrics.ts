import type { ScreeningWithRelations } from "@/lib/types";
import { screeningToVerdict } from "./traffic-light";

export interface DashboardMetrics {
  totalInScreening: number;
  screenFailureRate: number;
  eligibleCount: number;
  pendingCount: number;
  total: number;
}

export function computeDashboardMetrics(
  screenings: ScreeningWithRelations[]
): DashboardMetrics {
  const total = screenings.length;
  const totalInScreening = screenings.filter(
    (s) => s.status === "pre_screening" || s.status === "screening"
  ).length;
  const failures = screenings.filter((s) => s.status === "screen_failure").length;
  const screenFailureRate =
    total === 0 ? 0 : Math.round((failures / total) * 100);

  let eligibleCount = 0;
  let pendingCount = 0;

  for (const screening of screenings) {
    const verdict = screeningToVerdict(screening);
    if (verdict === "eligible") eligibleCount += 1;
    if (verdict === "pending") pendingCount += 1;
  }

  return {
    totalInScreening,
    screenFailureRate,
    eligibleCount,
    pendingCount,
    total,
  };
}

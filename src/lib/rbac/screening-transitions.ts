import type { ScreeningStatus } from "@/lib/types";
import type { AppRole } from "./types";

/**
 * Transiciones de estatus permitidas por rol (arrastre en el tracker).
 * Randomizado lo marca el coordinador o el PI cuando el sponsor
 * ya asignó kit.
 */
const ALLOWED_TRANSITIONS: Record<
  AppRole,
  readonly ScreeningStatus[]
> = {
  investigator: [
    "pre_screening",
    "screening",
    "randomized",
    "screen_failure",
  ],
  sub_investigator: [
    "pre_screening",
    "screening",
    "randomized",
    "screen_failure",
  ],
  coordinator: [
    "pre_screening",
    "screening",
    "randomized",
    "screen_failure",
  ],
  monitor: [],
};

export function canSetScreeningStatus(
  role: AppRole,
  status: ScreeningStatus
): boolean {
  return ALLOWED_TRANSITIONS[role].includes(status);
}

export function screeningStatusRequiresInvestigator(
  status: ScreeningStatus
): boolean {
  return status === "randomized";
}

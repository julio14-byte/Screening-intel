import type { ScreeningStatus } from "@/lib/types";
import type { AppRole } from "./types";

/**
 * Transiciones de estatus permitidas por rol (arrastre en el tracker).
 * `randomized` a mano requiere PI/sub. Con IWRS activo el coordinador
 * randomiza por RPC (`iwrs_randomize`), no arrastrando la tarjeta.
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
  coordinator: ["pre_screening", "screening", "screen_failure"],
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

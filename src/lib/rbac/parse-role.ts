import type { AppRole } from "./types";

const APP_ROLES: readonly AppRole[] = [
  "investigator",
  "sub_investigator",
  "coordinator",
  "monitor",
];

export type RoleLookup =
  | { ok: true; role: AppRole }
  | { ok: false; reason: "missing" | "invalid" };

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Un rol ausente es el caso del alta, antes de que el trigger escriba la fila.
 * Un valor que no está en el enum no se promueve a coordinador.
 */
export function roleFromRow(role: unknown): RoleLookup {
  if (role == null) return { ok: false, reason: "missing" };
  if (!isAppRole(role)) return { ok: false, reason: "invalid" };
  return { ok: true, role };
}

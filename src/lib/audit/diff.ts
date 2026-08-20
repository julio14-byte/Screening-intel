import type { AuditFieldChange } from "./types";

const IGNORED_DIFF_KEYS = new Set(["updated_at"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

/** Calcula diferencias campo a campo entre old_data y new_data. */
export function computeAuditDiff(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): AuditFieldChange[] {
  if (!oldData && !newData) return [];

  const oldObj = oldData ?? {};
  const newObj = newData ?? {};
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changes: AuditFieldChange[] = [];

  for (const field of keys) {
    if (IGNORED_DIFF_KEYS.has(field)) continue;

    const before = oldObj[field];
    const after = newObj[field];

    const beforeJson = JSON.stringify(before ?? null);
    const afterJson = JSON.stringify(after ?? null);

    if (beforeJson !== afterJson) {
      changes.push({ field, before, after });
    }
  }

  return changes;
}

export { formatValue, isPlainObject };

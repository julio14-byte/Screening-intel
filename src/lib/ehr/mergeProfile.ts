/** Une arrays de texto sin duplicados (case-insensitive). */
export function mergeStringArrays(
  existing: string[],
  incoming: string[] | undefined
): string[] {
  if (!incoming?.length) return existing;
  const seen = new Set(existing.map((v) => v.toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

/** Merge de laboratorios: valores entrantes pisan claves existentes. */
export function mergeLaboratories(
  existing: Record<string, number>,
  incoming: Record<string, number> | undefined,
  mode: "replace" | "merge"
): Record<string, number> {
  if (!incoming || !Object.keys(incoming).length) {
    return existing;
  }
  if (mode === "replace") {
    return { ...incoming };
  }
  return { ...existing, ...incoming };
}

import { clinicalTermsMatch } from "@/lib/matching/clinicalTerms";

/** Une arrays de texto sin duplicados (sinónimos ES/EN cuentan como el mismo término). */
export function mergeStringArrays(
  existing: string[],
  incoming: string[] | undefined,
  kind: "condition" | "medication" = "condition"
): string[] {
  if (!incoming?.length) return existing;
  const merged = [...existing];
  for (const item of incoming) {
    const already = merged.some((current) =>
      clinicalTermsMatch(current, item, kind)
    );
    if (!already) merged.push(item);
  }
  return merged;
}

/** Merge de laboratorios: valores entrantes pisan claves sinónimas. */
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
  const result = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const synonymKey = Object.keys(result).find((current) =>
      clinicalTermsMatch(current, key, "lab")
    );
    if (synonymKey) result[synonymKey] = value;
    else result[key] = value;
  }
  return result;
}

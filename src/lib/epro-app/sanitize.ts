/** Sanitiza valores del cuestionario antes de persistir (Zod ya limita tipos y largo). */
export function sanitizeAnswerValue(
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return value;
  }
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 500);
}

/** Extrae un mensaje usable de Error, PostgrestError u objetos `{ message }`. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

/** Tabla o columna ausente (migración no aplicada / schema cache). */
export function isMissingSchemaError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message = toErrorMessage(error, "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message)
  );
}

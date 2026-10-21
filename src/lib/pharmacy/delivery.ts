export const DELIVERY_MIGRATION =
  "20261021060000_medication_delivered_on.sql";

export const DELIVERY_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021060000_medication_delivered_on.sql y recargar el schema.";

export function isMissingDeliveryColumn(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /medication_delivered_on/i.test(message) &&
    /does not exist|schema cache|could not find|PGRST204|PGRST205|42703/i.test(message)
  );
}

/** Fecha calendario YYYY-MM-DD, sin hora. */
export function isDeliveryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** El día de entrega no puede quedar en el futuro lejano (tolera el cambio de fecha UTC). */
export function isPlausibleDeliveryDate(value: string, now = new Date()): boolean {
  if (!isDeliveryDate(value) || value < "1990-01-01") return false;
  const cap = new Date(now);
  cap.setUTCDate(cap.getUTCDate() + 1);
  return value <= cap.toISOString().slice(0, 10);
}

export function formatDeliveryDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

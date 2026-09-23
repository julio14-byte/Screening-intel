export const PRESCRIPTION_STATUSES = ["draft", "delivered", "cancelled"] as const;

export const PRESCRIPTION_STATUS_LABEL: Record<
  (typeof PRESCRIPTION_STATUSES)[number],
  string
> = {
  draft: "Borrador",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

export const MOVEMENT_KIND_LABEL: Record<"receive" | "dispense" | "adjust", string> = {
  receive: "Recepción",
  dispense: "Entrega",
  adjust: "Ajuste",
};

export function parseQuantity(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatQuantity(value: number, unit?: string): string {
  const n = Number(value);
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  return unit ? `${shown} ${unit}` : shown;
}

export function isLowStock(onHand: number, received: number): boolean {
  if (onHand <= 0) return true;
  if (received <= 0) return false;
  return onHand / received <= 0.15;
}

/** Meses que se cobran en el plan anual. Los otros dos quedan incluidos. */
export const ANNUAL_MONTHS_BILLED = 10;

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export function annualAmount(monthlyPrice: number): number {
  return monthlyPrice * ANNUAL_MONTHS_BILLED;
}

export function planQuote(
  monthlyPrice: number,
  interval: BillingInterval
): { amount: number; cadence: string | null; note: string | null } {
  if (monthlyPrice <= 0) return { amount: 0, cadence: null, note: null };
  if (interval === "year") {
    return {
      amount: annualAmount(monthlyPrice),
      cadence: "USD/año",
      note: "Incluye 2 meses",
    };
  }
  return { amount: monthlyPrice, cadence: "USD/mes", note: null };
}

export function formatPlanAmount(amount: number): string {
  return amount.toLocaleString("es-MX");
}

export function billingIntervalLabel(interval: BillingInterval | null | undefined): string {
  if (interval === "year") return "Anual";
  if (interval === "month") return "Mensual";
  return "—";
}

/**
 * `null` o ausente es mensual, para no romper el checkout que ya manda solo `planId`.
 * Cualquier otro valor es inválido.
 */
export function parseBillingInterval(value: unknown): BillingInterval | null {
  if (value == null || value === "") return "month";
  if (value === "month" || value === "year") return value;
  return null;
}

export function parseCheckoutRequest(body: {
  planId?: unknown;
  interval?: unknown;
}):
  | { ok: true; planId: "pro" | "pro_plus"; interval: BillingInterval }
  | { ok: false; error: string } {
  const planId = body.planId == null || body.planId === "" ? "pro" : body.planId;
  if (planId !== "pro" && planId !== "pro_plus") {
    return { ok: false, error: "Plan inválido." };
  }
  const interval = parseBillingInterval(body.interval);
  if (!interval) return { ok: false, error: "Periodo de cobro inválido." };
  return { ok: true, planId, interval };
}

/** Precio de Stripe primero; si no viene, el metadata que dejó el checkout. */
export function intervalFromStripePrice(
  priceInterval: unknown,
  metadataInterval: unknown
): BillingInterval {
  if (priceInterval === "year" || priceInterval === "month") return priceInterval;
  if (metadataInterval === "year" || metadataInterval === "month") return metadataInterval;
  return "month";
}

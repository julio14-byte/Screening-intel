import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANNUAL_MONTHS_BILLED,
  annualAmount,
  formatPlanAmount,
  intervalFromStripePrice,
  parseCheckoutRequest,
  planQuote,
} from "../src/lib/billing/interval";
import { getStripePriceId, stripePriceEnv } from "../src/plugins/stripe/plans";

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

process.env.STRIPE_PRICE_ID_PRO = "price_month_pro";
process.env.STRIPE_PRICE_ID_PRO_ANNUAL = "price_year_pro";
process.env.STRIPE_PRICE_ID_PRO_PLUS = "price_month_plus";
process.env.STRIPE_PRICE_ID_PRO_PLUS_ANNUAL = "price_year_plus";

assert(ANNUAL_MONTHS_BILLED === 10, "el anual cobra 10 meses");
assert(annualAmount(149) === 1490, "Pro anual es 1490");
assert(annualAmount(329) === 3290, "Pro+ anual es 3290");
assert(planQuote(149, "month").cadence === "USD/mes", "mensual en USD/mes");
assert(planQuote(149, "year").cadence === "USD/año", "anual en USD/año");
assert(planQuote(149, "year").note === "Incluye 2 meses", "el anual dice que incluye 2 meses");
assert(planQuote(0, "year").amount === 0 && planQuote(0, "year").note == null, "Free no tiene anual");
assert(formatPlanAmount(1490).replace(/\D/g, "") === "1490", "el monto anual se lee como 1490");

const empty = parseCheckoutRequest({});
assert(empty.ok && empty.planId === "pro" && empty.interval === "month", "sin cuerpo: Pro mensual");
const annual = parseCheckoutRequest({ planId: "pro_plus", interval: "year" });
assert(annual.ok && annual.planId === "pro_plus" && annual.interval === "year", "acepta Pro+ anual");
assert(!parseCheckoutRequest({ planId: "enterprise" }).ok, "rechaza un plan desconocido");
assert(!parseCheckoutRequest({ interval: "anual" }).ok, "rechaza un periodo que no es month o year");

assert(intervalFromStripePrice("year", "month") === "year", "el precio de Stripe gana al metadata");
assert(intervalFromStripePrice(undefined, "year") === "year", "sin precio, usa el metadata del checkout");
assert(intervalFromStripePrice("week", "nope") === "month", "un intervalo raro cae en mensual");

assert(getStripePriceId("pro", "month") === "price_month_pro", "price id mensual de Pro");
assert(getStripePriceId("pro", "year") === "price_year_pro", "price id anual de Pro");
assert(getStripePriceId("pro_plus", "year") === "price_year_plus", "price id anual de Pro+");
assert(
  stripePriceEnv("pro", "year") === "STRIPE_PRICE_ID_PRO_ANNUAL",
  "el error nombra la variable anual de Pro"
);

const migration = readFileSync(
  resolve("supabase/migrations/20261022180000_billing_interval.sql"),
  "utf8"
);
assert(migration.includes("billing_interval"), "la migración agrega billing_interval");
assert(
  migration.includes("billing_interval in ('month', 'year')"),
  "solo month o year"
);
assert(migration.includes("plan_id in ('pro', 'pro_plus')"), "las suscripciones actuales quedan en mensual");

const checkout = readFileSync(resolve("src/plugins/stripe/checkout.ts"), "utf8");
assert(checkout.includes("billing_interval: interval"), "el checkout guarda el intervalo en Stripe");
assert(readFileSync(resolve("src/app/api/stripe/checkout/route.ts"), "utf8").includes("parseCheckoutRequest"), "la ruta valida el periodo");
assert(
  readFileSync(resolve("src/components/landing/LandingPricing.tsx"), "utf8").includes("BillingIntervalToggle"),
  "la landing deja elegir mensual o anual"
);
assert(
  readFileSync(resolve("src/components/settings/PlanUpgradeCards.tsx"), "utf8").includes("Pasar a anual"),
  "el mismo plan puede pasar a anual"
);
assert(
  readFileSync(resolve("src/plugins/stripe/webhook.ts"), "utf8").includes("billing_interval: null"),
  "al cancelar se olvida el intervalo"
);

if (failed > 0) {
  console.error(`verify-billing-interval: ${failed} fallo(s)`);
  process.exit(1);
}
console.log("verify-billing-interval: precio anual de 10 meses, checkout e intervalo en la organización OK");

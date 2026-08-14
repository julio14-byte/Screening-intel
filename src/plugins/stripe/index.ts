/** Metadata del plugin Stripe (plantilla VibeFast). */
export const stripePlugin = {
  id: "stripe",
  name: "Stripe Subscriptions",
  description:
    "Checkout, portal de cliente, webhook y paywall para planes mensuales vía Stripe.",
  featureKey: "payments",
  migration: "0002_profiles_saas_fase1.sql",
  envVars: [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID_PRO",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  routes: {
    checkout: "/api/stripe/checkout",
    portal: "/api/stripe/portal",
    webhook: "/api/webhooks/stripe",
    billing: "/account/billing",
  },
};

export * from "./client";
export * from "./organization";
export * from "./plans";
export * from "./checkout";
export * from "./portal";
export * from "./webhook";
export * from "./paywall";

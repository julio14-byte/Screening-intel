import config from "@/config";

/** Límites por plan — Fase 1 SaaS (research sites). */
export const SAAS_PLAN_LIMITS = {
  free: { patientLimit: 50, protocolLimit: 3, userLimit: 1 },
  starter: { patientLimit: 50, protocolLimit: 3, userLimit: 1 },
  pro: { patientLimit: 500, protocolLimit: 50, userLimit: 3 },
  pro_plus: { patientLimit: 2000, protocolLimit: 100, userLimit: 10 },
} as const;

export type PlanId = keyof typeof SAAS_PLAN_LIMITS;

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  stripePriceId?: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string | null;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  trial_ends_at: string;
  patient_limit: number;
  protocol_limit: number;
  user_limit: number;
  created_at: string;
}

export function getPricingPlans(): PricingPlan[] {
  return config.pricing?.plans ?? [];
}

export function getPlanConfig(planId: string): PricingPlan | undefined {
  const normalized = planId === "starter" ? "free" : planId;
  return getPricingPlans().find((p) => p.id === normalized);
}

export function getStripePriceId(planId: string): string {
  if (planId === "pro") {
    return (
      process.env.STRIPE_PRICE_ID_PRO ||
      getPlanConfig("pro")?.stripePriceId ||
      ""
    );
  }
  if (planId === "pro_plus") {
    return (
      process.env.STRIPE_PRICE_ID_PRO_PLUS ||
      getPlanConfig("pro_plus")?.stripePriceId ||
      ""
    );
  }
  return getPlanConfig(planId)?.stripePriceId || "";
}

export function getPlanLimits(planId: string) {
  const normalized = planId === "starter" ? "free" : planId;
  return SAAS_PLAN_LIMITS[normalized as PlanId] ?? SAAS_PLAN_LIMITS.free;
}

export function isSubscriptionActive(organization: OrganizationRow | null): boolean {
  if (!organization) return false;

  const status = organization.subscription_status;
  if (status === "active" || status === "past_due") return true;

  if (status === "trialing") {
    if (!organization.trial_ends_at) return true;
    return new Date(organization.trial_ends_at) > new Date();
  }

  return false;
}

export function subscriptionStatusLabel(status: string | undefined): string {
  switch (status) {
    case "active":
      return "Activa";
    case "trialing":
      return "Periodo de prueba";
    case "past_due":
      return "Pago pendiente";
    case "canceled":
      return "Cancelada";
    case "incomplete":
      return "Incompleta";
    case "unpaid":
      return "Impaga";
    default:
      return status ?? "—";
  }
}

export function formatWeekTrend(count: number): string {
  if (!count) return "Sin nuevos en los últimos 7 días";
  return `+${count} en los últimos 7 días`;
}

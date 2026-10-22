"use client";

import { useState } from "react";
import config from "@/config";
import { getPricingPlans } from "@/plugins/stripe/plans";
import type { PricingPlan } from "@/plugins/stripe/plans";
import { BillingIntervalToggle } from "@/components/billing/BillingIntervalToggle";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Card } from "@/components/ui/Card";
import {
  formatPlanAmount,
  planQuote,
  type BillingInterval,
} from "@/lib/billing/interval";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function PlanUpgradeCards({
  currentPlanId,
  currentInterval = null,
  initialInterval = "month",
  showCheckout = true,
}: {
  currentPlanId: string;
  currentInterval?: BillingInterval | null;
  initialInterval?: BillingInterval;
  showCheckout?: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  if (!config.features.pricing) return null;

  const plans = getPricingPlans();
  const normalizedCurrent =
    currentPlanId === "starter" ? "free" : currentPlanId;
  const activeInterval = currentInterval ?? (normalizedCurrent === "free" ? null : "month");

  return (
    <div className="overflow-visible pt-3">
      <BillingIntervalToggle value={interval} onChange={setInterval} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const samePlan = plan.id === normalizedCurrent;
          const sameCycle = plan.price === 0 || interval === activeInterval;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              isCurrent={samePlan && sameCycle}
              samePlan={samePlan}
              showCheckout={showCheckout}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  isCurrent,
  samePlan,
  showCheckout,
}: {
  plan: PricingPlan;
  interval: BillingInterval;
  isCurrent: boolean;
  samePlan: boolean;
  showCheckout: boolean;
}) {
  const quote = planQuote(plan.price, interval);
  const canCheckout =
    !isCurrent &&
    plan.price > 0 &&
    config.features.payments &&
    showCheckout;

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col p-4 sm:p-5",
        plan.highlighted && "ring-2 ring-violet-400/50",
        isCurrent && "border-2 border-emerald-400/60 bg-emerald-50/30"
      )}
    >
      {isCurrent ? (
        <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white">
          Plan activo
        </span>
      ) : plan.highlighted ? (
        <span className="absolute -top-2.5 left-4 rounded-full bg-violet-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white">
          Recomendado
        </span>
      ) : null}

      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{plan.description}</p>

      <div className="mt-4">
        <p className="text-2xl font-bold tabular-nums text-slate-900">
          {quote.amount === 0 ? "Gratis" : `$${formatPlanAmount(quote.amount)}`}
          {quote.cadence ? (
            <span className="text-sm font-normal text-slate-500"> {quote.cadence}</span>
          ) : null}
        </p>
        {quote.note ? (
          <p className="mt-1 text-xs font-medium text-violet-700">{quote.note}</p>
        ) : null}
      </div>

      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-xs text-slate-600"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            {feature}
          </li>
        ))}
      </ul>

      {canCheckout ? (
        <div className="mt-4">
          <CheckoutButton
            planId={plan.id}
            interval={interval}
            label={
              samePlan
                ? interval === "year"
                  ? "Pasar a anual"
                  : "Pasar a mensual"
                : `Cambiar a ${plan.name}`
            }
          />
        </div>
      ) : isCurrent ? (
        <p className="mt-4 text-xs font-medium text-emerald-700">
          Plan vigente
        </p>
      ) : plan.price === 0 ? (
        <p className="mt-4 text-xs text-slate-500">Incluido al registrarte</p>
      ) : null}
    </Card>
  );
}

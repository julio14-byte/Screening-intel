import config from "@/config";
import { getPricingPlans } from "@/plugins/stripe/plans";
import type { PricingPlan } from "@/plugins/stripe/plans";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function PlanUpgradeCards({
  currentPlanId,
  showCheckout = true,
}: {
  currentPlanId: string;
  showCheckout?: boolean;
}) {
  if (!config.features.pricing) return null;

  const plans = getPricingPlans();
  const normalizedCurrent =
    currentPlanId === "starter" ? "free" : currentPlanId;

  return (
      <div className="grid gap-4 sm:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={plan.id === normalizedCurrent}
          showCheckout={showCheckout}
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  showCheckout,
}: {
  plan: PricingPlan;
  isCurrent: boolean;
  showCheckout: boolean;
}) {
  const canCheckout =
    !isCurrent &&
    plan.price > 0 &&
    config.features.payments &&
    showCheckout;

  return (
    <Card
      className={cn(
        "relative p-5",
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

      <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">
        {plan.price === 0 ? "Gratis" : `$${plan.price}`}
        {plan.price > 0 ? (
          <span className="text-sm font-normal text-slate-500">
            /{plan.interval}
          </span>
        ) : null}
      </p>

      <ul className="mt-4 space-y-1.5">
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
            label={`Upgrade a ${plan.name}`}
          />
        </div>
      ) : isCurrent ? (
        <p className="mt-4 text-xs font-medium text-emerald-700">
          Este es tu plan actual
        </p>
      ) : plan.price === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          Incluido al registrarte
        </p>
      ) : null}
    </Card>
  );
}

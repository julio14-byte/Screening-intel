import config from "@/config";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Vitrina de precios — se muestra si features.pricing está activo. */
export function PricingSection() {
  if (!config.features.pricing) return null;

  const { eyebrow, title, subtitle, plans } = config.pricing;

  return (
    <section aria-label="Precios" className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
          {eyebrow}
        </p>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "p-5",
              plan.highlighted && "ring-2 ring-violet-400/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
              </div>
              {plan.highlighted ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                  Popular
                </span>
              ) : null}
            </div>
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
            {plan.price > 0 && config.features.payments ? (
              <div className="mt-4">
                <CheckoutButton planId={plan.id} label={plan.cta} />
              </div>
            ) : (
              <p className="mt-4 text-xs font-medium text-violet-600">
                {plan.cta}
              </p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

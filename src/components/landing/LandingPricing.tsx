import Link from "next/link";
import config from "@/config";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function LandingPricing() {
  if (!config.features.pricing) return null;

  const { eyebrow, title, subtitle, plans } = config.pricing;

  return (
    <section id="precios" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-violet-200">{subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => {
            const href =
              plan.id === "pro"
                ? "/login?from=/account/billing"
                : "/login?from=/dashboard";

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm",
                  plan.highlighted &&
                    "border-violet-400/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 ring-1 ring-violet-400/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-violet-200/80">
                      {plan.description}
                    </p>
                  </div>
                  {plan.highlighted ? (
                    <span className="rounded-full bg-violet-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-violet-100">
                      Popular
                    </span>
                  ) : null}
                </div>

                <p className="mt-5 text-3xl font-bold tabular-nums text-white">
                  {plan.price === 0 ? "Gratis" : `$${plan.price}`}
                  {plan.price > 0 ? (
                    <span className="text-base font-normal text-violet-300">
                      /{plan.interval}
                    </span>
                  ) : null}
                </p>

                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-violet-100/90"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    plan.highlighted
                      ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:from-cyan-400 hover:to-violet-400"
                      : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {config.features.payments ? (
          <p className="mt-6 text-center text-xs text-violet-300/70">
            Pagos seguros con Stripe. Cancela cuando quieras desde el portal de
            cliente.
          </p>
        ) : null}
      </div>
    </section>
  );
}

import Link from "next/link";
import config from "@/config";
import { routes, loginUrlWithFrom } from "@/lib/app/routes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function LandingPricing() {
  if (!config.features.pricing) return null;

  const { eyebrow, title, subtitle, plans } = config.pricing;

  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-t border-white/10 px-4 py-20 sm:px-6"
    >
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
            const appPath =
              plan.id === "pro" ? routes.app.billing : routes.app.dashboard;
            const href = loginUrlWithFrom(appPath);

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm",
                  plan.highlighted &&
                    "border-violet-400/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 ring-1 ring-violet-400/30"
                )}
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold text-white">
                    Más popular
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-violet-200/80">{plan.description}</p>

                <p className="mt-5 text-3xl font-bold tabular-nums text-white">
                  {plan.price === 0 ? "Gratis" : `$${plan.price}`}
                  {plan.price > 0 ? (
                    <span className="text-base font-normal text-violet-300">
                      /{plan.interval}
                    </span>
                  ) : null}
                </p>

                <ul className="mt-5 flex-1 space-y-2">
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
      </div>
    </section>
  );
}

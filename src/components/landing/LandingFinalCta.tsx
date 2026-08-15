import Link from "next/link";
import config from "@/config";
import { ArrowRight } from "lucide-react";

export function LandingFinalCta() {
  const { eyebrow, title, subtitle, cta, ctaSecondary } =
    config.landing.finalCta;

  return (
    <section className="relative overflow-hidden border-t border-white/10 px-4 py-20 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-5 text-balance text-lg text-violet-200">{subtitle}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400"
          >
            {cta.label}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          {ctaSecondary ? (
            <a
              href={ctaSecondary.href}
              className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {ctaSecondary.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

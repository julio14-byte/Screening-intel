import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import config from "@/config";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";

export function LandingHero() {
  const { eyebrow, title, subtitle } = config.landing.hero;
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        {eyebrow ? (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            {eyebrow}
          </div>
        ) : null}

        <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-violet-200/90 sm:text-xl">
          {subtitle}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#pricing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto"
          >
            Ver planes y suscripciones
            <ArrowRight className="h-5 w-5" aria-hidden />
          </a>
          <Link
            href={enterHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15 sm:w-auto"
          >
            Entrar a la app
          </Link>
        </div>
        <p className="mt-4 text-sm text-violet-400">
          Elige un plan abajo o entra directo con tu cuenta de research site.
        </p>
      </div>
    </section>
  );
}

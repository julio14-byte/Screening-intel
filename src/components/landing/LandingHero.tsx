import Link from "next/link";
import { ArrowRight, Heart, LogIn } from "lucide-react";
import config from "@/config";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";

export function LandingHero() {
  const { eyebrow, title, subtitle } = config.landing.hero;
  const coordinatorHref = loginUrlWithFrom(routes.app.dashboard);
  const candidatoHref = routes.candidato.hub;

  return (
    <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        {eyebrow ? (
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-violet-200 sm:mb-6 sm:text-xs">
            <Heart className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden />
            <span className="truncate">{eyebrow}</span>
          </div>
        ) : null}

        <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-violet-200/90 sm:mt-6 sm:text-lg lg:text-xl">
          {subtitle}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href={candidatoHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto sm:px-6 sm:text-base"
          >
            Soy paciente — pre-registro
            <ArrowRight className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
          </Link>
          <Link
            href={coordinatorHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto sm:px-6 sm:text-base"
          >
            <LogIn className="h-4 w-4 shrink-0" aria-hidden />
            Acceso coordinadores
          </Link>
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="text-sm font-medium text-violet-300 underline-offset-4 hover:text-white hover:underline"
          >
            Ver planes para research sites
          </a>
        </div>
        <p className="mt-3 text-xs text-violet-400 sm:text-sm">
          Pacientes: usa el link de tu centro o el pre-registro. Coordinadores: entra con tu cuenta.
        </p>
      </div>
    </section>
  );
}

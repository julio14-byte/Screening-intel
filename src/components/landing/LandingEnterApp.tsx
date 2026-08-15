import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import config from "@/config";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";

export function LandingEnterApp() {
  const { eyebrow, title, subtitle } = config.landing.enterApp;
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <section
      id="entrar"
      className="scroll-mt-20 border-t border-white/10 bg-black/20 px-4 py-20 sm:px-6"
    >
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
          <p className="mt-4 text-balance text-lg text-violet-200">{subtitle}</p>
        ) : null}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={enterHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            Entrar a la app
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <Link
            href={routes.login}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-4 text-sm text-violet-400">
          Tras iniciar sesión irás al tablero con pacientes, protocolos y métricas.
        </p>
      </div>
    </section>
  );
}

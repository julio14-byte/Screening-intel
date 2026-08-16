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
      className="scroll-mt-14 border-t border-white/10 bg-black/20 px-4 py-12 sm:scroll-mt-16 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 text-balance text-sm text-violet-200 sm:mt-4 sm:text-lg">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href={enterHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base"
          >
            <LogIn className="h-5 w-5 shrink-0" aria-hidden />
            Entrar a la app
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          <Link
            href={routes.login}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

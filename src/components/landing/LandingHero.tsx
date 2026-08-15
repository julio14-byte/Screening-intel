import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  FlaskConical,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";

const MOCK_NAV = [
  { label: "Tablero", icon: LayoutDashboard, active: true },
  { label: "Pacientes", icon: Users },
  { label: "Protocolos", icon: FlaskConical },
  { label: "Tracker", icon: KanbanSquare },
  { label: "Asistente", icon: MessageSquare },
];

export function LandingHero() {
  const { eyebrow, title, subtitle, cta, ctaSecondary } = config.landing.hero;

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
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
          <Link
            href={cta.href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto"
          >
            {cta.label}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          {ctaSecondary ? (
            <a
              href={ctaSecondary.href}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              {ctaSecondary.label}
            </a>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-violet-400">14 días de prueba · sin tarjeta</p>
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <div className="rounded-2xl border border-white/15 bg-white/5 shadow-2xl shadow-violet-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-violet-300/70">
              https://{config.app.domain}/dashboard
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-[168px_1fr] sm:p-6">
            <aside className="hidden rounded-xl border border-white/10 bg-indigo-950/60 p-3 sm:block">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Logo className="h-6 w-6" />
                <span className="text-sm font-bold text-white">
                  {config.brand.logoText}
                </span>
              </div>
              <ul className="space-y-1">
                {MOCK_NAV.map(({ label, icon: Icon, active }) => (
                  <li
                    key={label}
                    className={
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm " +
                      (active
                        ? "bg-violet-500/20 font-medium text-violet-100"
                        : "text-violet-300/60")
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </aside>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 h-8 w-8 rounded-lg bg-cyan-400/20" />
                    <div className="mb-2 h-3 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  Funnel de screening
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-5/6 rounded bg-white/5" />
                  <div className="h-3 w-2/3 rounded bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

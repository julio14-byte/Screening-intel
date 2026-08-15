import Link from "next/link";
import config from "@/config";
import {
  Activity,
  ArrowRight,
  FlaskConical,
  KanbanSquare,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { LandingPricing } from "./LandingPricing";
import { WaitlistForm } from "./WaitlistForm";

const FEATURES = [
  {
    icon: Users,
    title: "Patient Registry",
    description:
      "Centraliza pacientes con perfil clínico estructurado para screening rápido.",
    accent: "from-cyan-400/20 to-cyan-500/5 text-cyan-300",
  },
  {
    icon: FlaskConical,
    title: "Protocol Matcher",
    description:
      "Cruza criterios de inclusión y exclusión contra tu cohorte automáticamente.",
    accent: "from-fuchsia-400/20 to-fuchsia-500/5 text-fuchsia-300",
  },
  {
    icon: KanbanSquare,
    title: "Screening Tracker",
    description:
      "Kanban de estados: candidato, en screening, incluido o excluido con trazabilidad.",
    accent: "from-amber-400/20 to-amber-500/5 text-amber-300",
  },
  {
    icon: RefreshCw,
    title: "Re-Match & Follow-up",
    description:
      "Re-evalúa pacientes cuando cambian protocolos o criterios del estudio.",
    accent: "from-emerald-400/20 to-emerald-500/5 text-emerald-300",
  },
  {
    icon: MessageSquare,
    title: "Asistente IA clínico",
    description:
      "Consulta criterios, resúmenes de pacientes y flujos de screening en chat.",
    accent: "from-violet-400/20 to-violet-500/5 text-violet-300",
  },
  {
    icon: Sparkles,
    title: "Métricas de producto",
    description:
      "KPIs de waitlist, conversión y uso del asistente para founders y ops.",
    accent: "from-rose-400/20 to-rose-500/5 text-rose-300",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-indigo-950/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-900/50">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold leading-tight">
              {config.app.name}
              <span className="block text-[11px] font-normal text-violet-300">
                Research Sites
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm text-violet-200 md:flex"
            aria-label="Landing"
          >
            <a href="#funciones" className="hover:text-white transition-colors">
              Funciones
            </a>
            <a href="#precios" className="hover:text-white transition-colors">
              Precios
            </a>
            {config.features.waitlist ? (
              <a href="#waitlist" className="hover:text-white transition-colors">
                Waitlist
              </a>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?from=/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-cyan-400 hover:to-violet-400 sm:px-4"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              14 días de prueba · Sin tarjeta para empezar
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Pre-screening inteligente para{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                research sites
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-violet-200/90 sm:text-xl">
              {config.app.description} Acelera matching de protocolos, tracking de
              screening y re-matching con un tablero diseñado para coordinadores de
              estudios clínicos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login?from=/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400 sm:w-auto"
              >
                Empezar trial gratis
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <a
                href="#precios"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Ver planes
              </a>
            </div>
            <dl className="mt-14 grid grid-cols-3 gap-4 border-t border-white/10 pt-10 sm:gap-8">
              <div>
                <dt className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  50+
                </dt>
                <dd className="mt-1 text-xs text-violet-300 sm:text-sm">
                  Pacientes en Starter
                </dd>
              </div>
              <div>
                <dt className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  3
                </dt>
                <dd className="mt-1 text-xs text-violet-300 sm:text-sm">
                  Protocolos activos trial
                </dd>
              </div>
              <div>
                <dt className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  14
                </dt>
                <dd className="mt-1 text-xs text-violet-300 sm:text-sm">
                  Días de prueba
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          id="funciones"
          className="scroll-mt-20 border-t border-white/10 bg-black/20 px-4 py-20 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Plataforma
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Todo lo que tu site necesita para screening
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-violet-200">
                Un solo lugar para registrar pacientes, evaluar protocolos y
                seguir el funnel de inclusión sin perder candidatos en el camino.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description, accent }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-violet-200/80">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingPricing />

        {config.features.waitlist ? (
          <section
            id="waitlist"
            className="scroll-mt-20 border-t border-white/10 px-4 py-20 sm:px-6"
          >
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Waitlist
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                ¿Aún no estás listo para el trial?
              </h2>
              <p className="mt-3 text-violet-200">
                Déjanos tu email y te avisamos de nuevas funciones, integraciones
                y disponibilidad en tu región.
              </p>
              <div className="mt-8">
                <WaitlistForm />
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-t border-white/10 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Listo para acelerar tu pre-screening?
            </h2>
            <p className="mt-3 text-violet-200">
              Crea tu cuenta en minutos y empieza con el plan Starter. Cuando
              crezcas, Site Pro escala con tu volumen de pacientes y protocolos.
            </p>
            <Link
              href="/login?from=/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:from-cyan-400 hover:to-violet-400"
            >
              Crear cuenta de prueba
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-violet-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {config.app.name}. MVP para research
            sites.
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-violet-200 transition-colors">
              Acceso
            </Link>
            <a href="#precios" className="hover:text-violet-200 transition-colors">
              Precios
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

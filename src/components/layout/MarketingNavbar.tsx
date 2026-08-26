import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";
import { Heart, LogIn, Menu } from "lucide-react";

const pricingHref = `${routes.landing}#pricing`;

export function MarketingNavbar() {
  const enterHref = loginUrlWithFrom(routes.app.dashboard);
  const candidatoHref = routes.candidato.hub;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/80 backdrop-blur-md">
      <nav
        className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3"
        aria-label="Principal"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <details className="relative shrink-0 md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center rounded-lg p-2 text-violet-200 hover:bg-white/10 [&::-webkit-details-marker]:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </summary>
            <ul className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/15 bg-indigo-950 p-2 shadow-xl">
              {config.landing.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={`${routes.landing}${item.href}`}
                    className="block rounded-lg px-3 py-2 text-sm text-violet-200 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={routes.app.docs}
                  className="block rounded-lg px-3 py-2 text-sm text-violet-200 hover:bg-white/10 hover:text-white"
                >
                  Documentación completa
                </Link>
              </li>
              <li>
                <Link
                  href={candidatoHref}
                  className="block rounded-lg px-3 py-2 text-sm text-violet-200 hover:bg-white/10 hover:text-white"
                >
                  Pre-registro pacientes
                </Link>
              </li>
            </ul>
          </details>

          <Link
            href={routes.landing}
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          >
            <Logo className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <span className="min-w-0 text-sm font-semibold leading-tight text-white">
              <span className="block truncate">{config.brand.logoText}</span>
              <span className="hidden text-[11px] font-normal text-violet-300 min-[360px]:block">
                {config.brand.tagline}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <Link
            href={routes.app.docs}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white md:inline"
          >
            Docs
          </Link>
          <Link
            href={pricingHref}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white md:inline"
          >
            Precios
          </Link>
          <Link
            href={candidatoHref}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white lg:inline"
          >
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              Pacientes
            </span>
          </Link>
          <Link
            href={enterHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-2.5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-cyan-400 hover:to-violet-400 sm:px-4 sm:text-sm"
          >
            <LogIn className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sm:hidden">Entrar</span>
            <span className="hidden sm:inline">Entrar a la app</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

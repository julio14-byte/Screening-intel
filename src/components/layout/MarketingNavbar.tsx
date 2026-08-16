import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";
import { LogIn, Menu } from "lucide-react";

export function MarketingNavbar() {
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/80 backdrop-blur-md">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
        aria-label="Principal"
      >
        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center rounded-lg p-2 text-violet-200 hover:bg-white/10 [&::-webkit-details-marker]:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </summary>
            <ul
              className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/15 bg-indigo-950 p-2 shadow-xl"
            >
              {config.landing.nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-violet-200 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href={enterHref}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-white/10"
                >
                  Entrar a la app
                </Link>
              </li>
            </ul>
          </details>

          <Link href={routes.landing} className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="text-sm font-semibold leading-tight text-white">
              {config.brand.logoText}
              <span className="block text-[11px] font-normal text-violet-300">
                Research Sites
              </span>
            </span>
          </Link>
        </div>

        <ul className="hidden items-center gap-6 md:flex">
          {config.landing.nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-sm text-violet-200 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={routes.app.docs}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white sm:inline"
          >
            Docs
          </Link>
          <a
            href="#pricing"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:text-white sm:inline"
          >
            Precios
          </a>
          <Link
            href={enterHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-cyan-400 hover:to-violet-400 sm:px-4"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}

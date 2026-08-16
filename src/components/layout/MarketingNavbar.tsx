import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";
import { LogIn } from "lucide-react";

export function MarketingNavbar() {
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/90 backdrop-blur-md">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3"
        aria-label="Principal"
      >
        <Link
          href={routes.landing}
          className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5"
        >
          <Logo className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <span className="min-w-0 text-sm font-semibold leading-tight text-white sm:text-base">
            <span className="block truncate">{config.brand.logoText}</span>
            <span className="block text-[10px] font-normal text-violet-300 sm:text-[11px]">
              Research Sites
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href={routes.app.docs}
            className="rounded-lg px-2 py-2 text-xs font-medium text-violet-200 transition-colors hover:text-white sm:px-3 sm:text-sm"
          >
            Docs
          </Link>
          <a
            href="#pricing"
            className="rounded-lg px-2 py-2 text-xs font-medium text-violet-200 transition-colors hover:text-white sm:px-3 sm:text-sm"
          >
            Precios
          </a>
          <Link
            href={enterHref}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-2.5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-cyan-400 hover:to-violet-400 sm:gap-1.5 sm:px-4 sm:text-sm"
          >
            <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}

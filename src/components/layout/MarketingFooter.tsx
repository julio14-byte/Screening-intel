import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
  const { tagline, links } = config.landing.footer;

  return (
    <footer className="border-t border-white/10 bg-indigo-950/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center sm:gap-8">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 shrink-0" />
            <span className="text-lg font-semibold text-white">
              {config.brand.logoText}
            </span>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-violet-300/90">
            {tagline}
          </p>

          <nav
            aria-label="Enlaces del sitio"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {links.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-violet-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-violet-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        <p className="mt-8 text-center text-xs text-violet-500">
          © {new Date().getFullYear()} {config.brand.logoText}
        </p>
      </div>
    </footer>
  );
}

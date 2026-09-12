import Link from "next/link";
import config from "@/config";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";
import type { TrustPage } from "@/config/trust";

export function MarketingDocPage({
  page,
  related,
}: {
  page: TrustPage;
  related?: Array<{ href: string; label: string }>;
}) {
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-xs">
          {config.brand.logoText}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {page.title}
        </h1>
        <p className="mt-3 text-sm text-violet-200 sm:text-base">{page.subtitle}</p>
        <p className="mt-2 text-xs text-violet-400">Actualizado: {page.updated}</p>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <Link
            href={routes.landing}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm text-violet-200 hover:bg-white/10"
          >
            ← Landing
          </Link>
          <Link
            href={enterHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Entrar a la app
          </Link>
          {(related ?? []).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm text-violet-200 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-10 space-y-10 sm:mt-12">
          {page.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24"
            >
              <h2 className="border-b border-white/10 pb-2 text-lg font-semibold text-white sm:text-xl">
                {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  className="mt-4 text-sm leading-relaxed text-violet-300/90"
                >
                  {p}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-violet-300/90">
                  {section.bullets.map((b) => (
                    <li key={b.slice(0, 48)}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import config from "@/config";
import { productDocs } from "@/config/docs";
import { loginUrlWithFrom, routes } from "@/lib/app/routes";

export const metadata = {
  title: `Documentación · ${config.app.name}`,
  description: productDocs.subtitle,
};

export default function DocsPage() {
  const enterHref = loginUrlWithFrom(routes.app.dashboard);

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-xs">
          Docs
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {productDocs.title}
        </h1>
        <p className="mt-3 text-sm text-violet-200 sm:text-base">
          {productDocs.subtitle}
        </p>

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
        </div>

        <div className="mt-10 space-y-8 sm:mt-12 sm:space-y-10">
          {productDocs.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20 sm:scroll-mt-24">
              <h2 className="border-b border-white/10 pb-2 text-lg font-semibold text-white sm:text-xl">
                {section.title}
              </h2>
              <ul className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
                {section.items.map((item) => (
                  <li key={item.heading}>
                    <h3 className="text-sm font-medium text-violet-100 sm:text-base">
                      {item.heading}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-violet-300/90">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
          Docs
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {productDocs.title}
        </h1>
        <p className="mt-3 text-violet-200">{productDocs.subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={routes.landing}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-violet-200 hover:bg-white/10"
          >
            ← Landing
          </Link>
          <Link
            href={enterHref}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Entrar a la app
          </Link>
        </div>

        <div className="mt-12 space-y-10">
          {productDocs.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="border-b border-white/10 pb-2 text-xl font-semibold text-white">
                {section.title}
              </h2>
              <ul className="mt-6 space-y-6">
                {section.items.map((item) => (
                  <li key={item.heading}>
                    <h3 className="font-medium text-violet-100">
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

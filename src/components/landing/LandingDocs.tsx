import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { productDocs } from "@/config/docs";

export function LandingDocs() {
  return (
    <section
      id="docs"
      className="scroll-mt-14 border-t border-white/10 bg-black/20 px-4 py-12 sm:scroll-mt-16 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-xs">
            Documentación
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {productDocs.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-violet-200 sm:text-base">
            {productDocs.subtitle}
          </p>
        </div>

        <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
          {productDocs.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6"
            >
              <div className="mb-3 flex items-center gap-2 text-violet-200 sm:mb-4">
                <BookOpen className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                <h3 className="font-semibold text-white">{section.title}</h3>
              </div>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.heading}>
                    <p className="text-sm font-medium text-violet-100">
                      {item.heading}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-violet-300/80">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center sm:mt-10">
          <Link
            href="/docs"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto sm:px-6"
          >
            Ver documentación completa
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { productDocs } from "@/config/docs";

export function LandingDocs() {
  return (
    <section
      id="docs"
      className="scroll-mt-20 border-t border-white/10 bg-black/20 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            Documentación
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {productDocs.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-violet-200">
            {productDocs.subtitle}
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {productDocs.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-violet-200">
                <BookOpen className="h-5 w-5 text-cyan-400" aria-hidden />
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

        <div className="mt-10 text-center">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Ver documentación completa
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

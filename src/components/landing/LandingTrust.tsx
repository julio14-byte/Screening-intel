import Link from "next/link";
import config from "@/config";
import { landingIcon } from "@/lib/landing/icons";

export function LandingTrust() {
  const { eyebrow, title, subtitle, items } = config.landing.trust;

  return (
    <section
      id="confianza"
      className="scroll-mt-20 border-t border-white/10 bg-black/20 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-2xl text-violet-200">{subtitle}</p>
          ) : null}
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = landingIcon(item.icon);

            return (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="block h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-violet-400/40 hover:bg-white/[0.08]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-violet-200/80">
                    {item.body}
                  </p>
                  <p className="mt-3 text-xs font-medium text-cyan-300">
                    Ver detalle →
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

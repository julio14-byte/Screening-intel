import config from "@/config";

export function LandingFAQ() {
  const { eyebrow, title, items } = config.landing.faq;

  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-white/10 bg-black/20 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition open:bg-white/[0.08]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-violet-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-violet-200/80">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

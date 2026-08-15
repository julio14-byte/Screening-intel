import config from "@/config";

export function LandingTestimonials() {
  const { eyebrow, title, subtitle, items } = config.landing.testimonials;

  return (
    <section className="border-t border-white/10 px-4 py-20 sm:px-6">
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

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.author}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <p className="text-sm leading-relaxed text-violet-100/90">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-white">{item.author}</p>
                <p className="text-xs text-violet-400">{item.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

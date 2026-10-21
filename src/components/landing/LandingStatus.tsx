import config from "@/config";

export function LandingStatus() {
  const { eyebrow, title, subtitle, items, source } = config.landing.status;

  return (
    <section
      id="hoy"
      className="scroll-mt-20 border-t border-white/10 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-violet-200">{subtitle}</p>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-violet-200/80">{item.body}</p>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-violet-400">
          {source}
        </p>
      </div>
    </section>
  );
}

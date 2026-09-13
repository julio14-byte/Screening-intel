import { Activity } from "lucide-react";
import type { OnePagerCopy } from "@/config/onePager";
import config from "@/config";

export function OnePagerDocument({ copy }: { copy: OnePagerCopy }) {
  const demoUrl = `https://${config.app.domain}`;

  return (
    <article className="one-pager-sheet mx-auto w-full max-w-[210mm] bg-white text-slate-900 shadow-xl shadow-slate-900/10 print:max-w-none print:shadow-none">
      <header className="border-b-2 border-violet-700 px-7 pb-4 pt-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                {copy.kicker}
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
                {config.app.name}
              </h1>
            </div>
          </div>
          <p className="hidden shrink-0 text-right text-[11px] text-slate-500 sm:block">
            <span className="block font-medium text-slate-700">
              {copy.demoUrlLabel}
            </span>
            <a href={demoUrl} className="text-violet-700 underline-offset-2 hover:underline">
              {config.app.domain}
            </a>
          </p>
        </div>
        <p className="mt-3 text-base font-semibold leading-snug text-slate-800 sm:text-lg">
          {copy.oneLiner}
        </p>
      </header>

      <div className="grid gap-0 sm:grid-cols-2">
        <section className="border-b border-slate-200 px-7 py-4 sm:border-r sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            {copy.problemTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-slate-700">{copy.problemLead}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-5 text-slate-700">
            {copy.problemItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="border-b border-slate-200 px-7 py-4 sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            {copy.productTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-slate-700">{copy.productLead}</p>
          <ol className="mt-3 space-y-2">
            {copy.steps.map((step) => (
              <li key={step.n} className="flex gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-700 text-[11px] font-bold text-white">
                  {step.n}
                </span>
                <p className="text-[13px] leading-5 text-slate-700">
                  <span className="font-semibold text-slate-900">{step.title}.</span>{" "}
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="border-b border-slate-200 px-7 py-4 sm:px-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
          {copy.whyTitle}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-4">
          {copy.whyItems.map((item) => (
            <li key={item.title}>
              <p className="text-[13px] font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-0 sm:grid-cols-3">
        <section className="border-b border-slate-200 px-7 py-4 sm:border-b-0 sm:border-r sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            {copy.buyerTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-slate-700">{copy.buyerBody}</p>
        </section>

        <section className="border-b border-slate-200 px-7 py-4 sm:border-b-0 sm:border-r sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            {copy.modelTitle}
          </h2>
          <p className="mt-2 text-[12px] leading-5 text-slate-600">{copy.modelLead}</p>
          <ul className="mt-2 space-y-1 text-[13px] leading-5 text-slate-800">
            {copy.plans.map((plan) => (
              <li key={plan.name}>
                <span className="font-semibold">
                  {plan.name} {plan.price}
                </span>
                <span className="block text-[12px] text-slate-600">{plan.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-7 py-4 sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            {copy.statusTitle}
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-5 text-slate-700">
            {copy.statusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-[13px] leading-5 text-violet-950">
            <span className="font-bold uppercase tracking-wide text-violet-800">
              {copy.askTitle}.{" "}
            </span>
            {copy.askBody}
          </p>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50 px-7 py-3 sm:px-8">
        <p className="text-[11px] leading-4 text-slate-500">{copy.disclaimer}</p>
        <p className="mt-1 text-[11px] text-slate-500 sm:hidden">
          {demoUrl}
        </p>
      </footer>
    </article>
  );
}

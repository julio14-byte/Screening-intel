"use client";

import Link from "next/link";
import type { OnePagerCopy, OnePagerLang } from "@/config/onePager";
import { routes } from "@/lib/app/routes";

export function OnePagerPrintBar({
  lang,
  copy,
}: {
  lang: OnePagerLang;
  copy: OnePagerCopy;
}) {
  return (
    <div className="no-print mx-auto flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-0">
      <Link
        href={routes.landing}
        className="text-sm font-medium text-violet-700 underline-offset-4 hover:text-violet-900 hover:underline"
      >
        ← {copy.backLabel}
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/one-pager"
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            lang === "es"
              ? "bg-violet-700 text-white"
              : "border border-violet-200 text-violet-800 hover:bg-violet-50"
          }`}
        >
          {copy.langEs}
        </Link>
        <Link
          href="/one-pager?lang=en"
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            lang === "en"
              ? "bg-violet-700 text-white"
              : "border border-violet-200 text-violet-800 hover:bg-violet-50"
          }`}
        >
          {copy.langEn}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {copy.printLabel}
        </button>
      </div>
    </div>
  );
}

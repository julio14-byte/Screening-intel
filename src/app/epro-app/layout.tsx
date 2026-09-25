import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import config from "@/config";

export const metadata: Metadata = {
  title: "ePRO · Crisvia",
  robots: { index: false, follow: false },
};

export default function EproAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/50 to-cyan-50">
      <header className="border-b border-violet-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-4">
          <p className="text-sm font-semibold text-indigo-950">
            {config.brand.logoText}
            <span className="block text-[11px] font-normal text-violet-600">
              ePRO del estudio
            </span>
          </p>
          <Link
            href="/epro-app/entrar"
            className="text-xs font-medium text-slate-400 hover:text-slate-700"
          >
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-8">{children}</main>
    </div>
  );
}

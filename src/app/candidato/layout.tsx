import type { ReactNode } from "react";
import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";

export default function CandidatoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-violet-50">
      <header className="border-b border-violet-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/candidato" className="flex items-center gap-2.5 text-sm font-semibold text-indigo-950">
            <Logo className="h-8 w-8 shrink-0" />
            <span>
              {config.brand.logoText}
              <span className="block text-[11px] font-normal text-violet-600">
                Pre-registro de candidatos
              </span>
            </span>
          </Link>
          <Link
            href={config.auth.loginUrl}
            className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-cyan-400 hover:to-violet-400 sm:text-sm"
          >
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

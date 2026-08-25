import type { ReactNode } from "react";
import Link from "next/link";
import config from "@/config";

export default function CandidatoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-violet-50">
      <header className="border-b border-violet-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/candidato" className="text-sm font-semibold text-indigo-950">
            {config.brand.logoText}
            <span className="block text-[11px] font-normal text-violet-600">
              Pre-registro de candidatos
            </span>
          </Link>
          <Link
            href={config.auth.loginUrl}
            className="text-xs text-violet-600 hover:text-violet-800"
          >
            Acceso coordinadores
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

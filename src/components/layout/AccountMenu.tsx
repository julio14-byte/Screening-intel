"use client";

import Link from "next/link";
import { ChevronDown, CreditCard, LogOut, User } from "lucide-react";
import { routes } from "@/lib/app/routes";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  email: string | null;
  loggingOut: boolean;
  onLogout: () => void;
};

function displayEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 14) return email;
  return `${local.slice(0, 12)}…@${domain}`;
}

export function AccountMenu({ email, loggingOut, onLogout }: AccountMenuProps) {
  const initial = email?.charAt(0).toUpperCase() ?? "?";

  return (
    <details className="relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 rounded-xl border border-violet-200/80 bg-white/90 px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition hover:border-violet-300 hover:bg-white",
          "[&::-webkit-details-marker]:hidden"
        )}
        aria-label="Menú de cuenta"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-indigo-950 sm:inline">
          {email ? displayEmail(email) : "Cuenta"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
      </summary>

      <ul className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-violet-100 bg-white p-1.5 shadow-lg shadow-violet-200/40">
        {email ? (
          <li className="border-b border-violet-50 px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-indigo-500">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate" title={email}>
                {email}
              </span>
            </p>
          </li>
        ) : null}
        <li>
          <Link
            href={routes.app.billing}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-800 transition hover:bg-violet-50"
          >
            <CreditCard className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            Facturación y plan
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-800 transition hover:bg-violet-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </li>
      </ul>
    </details>
  );
}

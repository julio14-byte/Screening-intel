"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  KanbanSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/patients", label: "Patient Registry", icon: Users },
  { href: "/protocols", label: "Protocol Matcher", icon: FlaskConical },
  { href: "/tracker", label: "Screening Tracker", icon: KanbanSquare },
  { href: "/rematch", label: "Re-Match & Follow-up", icon: RefreshCw },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white">
        <Link
          href="/"
          className="flex items-center gap-2 border-b border-slate-200 px-4 py-4"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-700 text-white">
            <Activity className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-slate-900">
              Screening Intelligence
            </span>
            <span className="block text-[11px] text-slate-500">
              Research Sites
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-0.5 p-2" aria-label="Principal">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sky-50 text-sky-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            MVP · Datos de demo
          </p>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-6 py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

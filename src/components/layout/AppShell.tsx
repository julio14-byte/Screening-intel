"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  idleClass: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Tablero Central",
    icon: LayoutDashboard,
    activeClass: "bg-white/15 text-white ring-1 ring-white/25",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  {
    href: "/patients",
    label: "Patient Registry",
    icon: Users,
    activeClass: "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  {
    href: "/protocols",
    label: "Protocol Matcher",
    icon: FlaskConical,
    activeClass: "bg-fuchsia-400/20 text-fuchsia-100 ring-1 ring-fuchsia-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  {
    href: "/tracker",
    label: "Screening Tracker",
    icon: KanbanSquare,
    activeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  {
    href: "/rematch",
    label: "Re-Match & Follow-up",
    icon: RefreshCw,
    activeClass: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  {
    href: "/chat",
    label: "Asistente IA",
    icon: MessageSquare,
    activeClass: "bg-violet-400/25 text-violet-100 ring-1 ring-violet-300/40",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { email?: string }) => setEmail(data.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950 text-white shadow-xl shadow-indigo-950/20">
        <Link
          href="/"
          className="flex items-center gap-3 border-b border-white/10 px-4 py-5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-900/50">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Screening Intelligence</span>
            <span className="block text-[11px] text-violet-300">Research Sites</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 p-3" aria-label="Principal">
          {NAV_ITEMS.map(({ href, label, icon: Icon, activeClass, idleClass }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active ? activeClass : idleClass
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          {email ? (
            <p className="truncate text-xs text-violet-300" title={email}>
              Sesión: <span className="font-medium text-violet-100">{email}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
          <p className="flex items-center gap-1.5 text-[11px] text-violet-400">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            MVP · Datos de demo
          </p>
        </div>
      </aside>

      <main className="ml-64 flex-1 px-6 py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

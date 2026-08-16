"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, LogOut } from "lucide-react";
import config from "@/config";
import { APP_NAV_STYLES, appIcon } from "@/lib/app/nav";
import { routes } from "@/lib/app/routes";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = useMemo(() => {
    return config.app.nav.filter((item) => {
      if (item.feature === "aiChat" && !config.features.aiChat) return false;
      if (item.feature === "payments" && !config.features.payments) return false;
      return true;
    });
  }, []);

  useEffect(() => {
    fetch(routes.apis.authSession)
      .then((res) => res.json())
      .then((data: { email?: string }) => setEmail(data.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch(routes.apis.authLogout, { method: "POST" });
    router.replace(config.auth.afterLogoutUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950 text-white shadow-xl shadow-indigo-950/20">
        <Link
          href={routes.app.dashboard}
          className="flex items-center gap-3 border-b border-white/10 px-4 py-5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-900/50">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{config.app.name}</span>
            <span className="block text-[11px] text-violet-300">Research Sites</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Principal">
          {navItems.map(({ href, label, icon }) => {
            const Icon = appIcon(icon);
            const styles = APP_NAV_STYLES[href] ?? APP_NAV_STYLES["/dashboard"];
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active ? styles.activeClass : styles.idleClass
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

      <main className="ml-64 flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

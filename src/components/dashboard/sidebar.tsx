"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, LogOut, X } from "lucide-react";
import config from "@/config";
import { APP_NAV_STYLES, appIcon } from "@/lib/app/nav";
import { routes } from "@/lib/app/routes";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  email: string | null;
  loggingOut: boolean;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function DashboardSidebar({
  email,
  loggingOut,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems = config.app.nav.filter((item) => {
    if (item.feature === "aiChat" && !config.features.aiChat) return false;
    if (item.feature === "payments" && !config.features.payments) return false;
    return true;
  });

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-indigo-950/60 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950 text-white shadow-xl shadow-indigo-950/20 transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Navegación principal"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <Link
            href={routes.app.dashboard}
            className="flex min-w-0 items-center gap-3"
            onClick={onMobileClose}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-900/50">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">
                {config.app.name}
              </span>
              <span className="block text-[11px] text-violet-300">
                Research Sites
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-violet-200 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Módulos">
          {navItems.map(({ href, label, icon }) => {
            const Icon = appIcon(icon);
            const styles = APP_NAV_STYLES[href] ?? APP_NAV_STYLES["/dashboard"];
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active ? styles.activeClass : styles.idleClass
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          {email ? (
            <p className="truncate text-xs text-violet-300" title={email}>
              Sesión:{" "}
              <span className="font-medium text-violet-100">{email}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
          <p className="flex items-center gap-1.5 text-[11px] text-violet-400">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
            MVP · Datos de demo
          </p>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, X } from "lucide-react";
import config from "@/config";
import { APP_ROLE_LABELS } from "@/lib/rbac/types";
import type { AppRole } from "@/lib/rbac/types";
import { APP_NAV_STYLES, appIcon } from "@/lib/app/nav";
import { routes } from "@/lib/app/routes";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export function AppSidebar({
  navItems,
  role,
  onNavigate,
  showClose,
  onClose,
  className,
}: {
  navItems: NavItem[];
  role: AppRole | null;
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950 text-white shadow-xl shadow-indigo-950/20",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
        <Link
          href={routes.app.dashboard}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-900/50">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block truncate text-sm font-semibold">
              {config.app.name}
            </span>
            <span className="block text-[11px] text-violet-300">
              Research Sites
            </span>
          </span>
        </Link>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-violet-200 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>

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
              onClick={onNavigate}
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

      <div className="border-t border-white/10 p-4">
        <p className="flex items-center gap-1.5 text-[11px] text-violet-400">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {role ? APP_ROLE_LABELS[role] : "Research site"}
        </p>
      </div>
    </aside>
  );
}

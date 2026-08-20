"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import config from "@/config";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useRole } from "@/contexts/role-context";
import { routes } from "@/lib/app/routes";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { role, isReadOnly } = useRole();

  const navItems = useMemo(() => {
    return config.app.nav
      .filter((item) => {
        if (item.feature === "aiChat" && !config.features.aiChat) return false;
        if (item.feature === "payments" && !config.features.payments)
          return false;
        if (item.href === routes.app.billing) return false;
        if (isReadOnly && item.href === routes.app.chat) return false;
        return true;
      })
      .map(({ href, label, icon }) => ({ href, label, icon }));
  }, [isReadOnly]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    fetch(routes.apis.authSession)
      .then((res) => readJsonResponse<{ email?: string }>(res))
      .then((data) => setEmail(data?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch(routes.apis.authLogout, {
      method: "POST",
      credentials: "include",
    });
    window.location.assign(config.auth.afterLogoutUrl);
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/50">
      {/* Sidebar desktop */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <AppSidebar navItems={navItems} role={role} />
      </div>

      {/* Drawer móvil */}
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-indigo-950/50 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={closeMenu}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-out lg:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <AppSidebar
          navItems={navItems}
          role={role}
          showClose
          onClose={closeMenu}
          onNavigate={closeMenu}
          className="h-full"
        />
      </div>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-violet-200/60 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-indigo-800 hover:bg-violet-50"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <span className="truncate text-sm font-semibold text-indigo-950">
          {config.app.name}
        </span>
        <AccountMenu
          email={email}
          role={role}
          loggingOut={loggingOut}
          onLogout={handleLogout}
          compact
        />
      </header>

      <main className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:py-6">
        <div
          className={cn(
            "mx-auto w-full",
            pathname.startsWith("/account") ? "max-w-7xl" : "max-w-6xl"
          )}
        >
          <div className="mb-4 hidden justify-end lg:mb-5 lg:flex">
            <AccountMenu
              email={email}
              role={role}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

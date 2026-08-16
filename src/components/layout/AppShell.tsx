"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import config from "@/config";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { routes } from "@/lib/app/routes";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      <DashboardSidebar
        email={email}
        loggingOut={loggingOut}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-violet-100/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-violet-200 p-2 text-indigo-700 hover:bg-violet-50"
            aria-label="Abrir menú"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold text-indigo-950">
            {config.app.name}
          </span>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

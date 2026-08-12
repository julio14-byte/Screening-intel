"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Activity,
  FlaskConical,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/patients", label: "Patient Registry", icon: Users },
  { href: "/protocols", label: "Protocol Matcher", icon: FlaskConical },
  { href: "/tracker", label: "Screening Tracker", icon: KanbanSquare },
  { href: "/rematch", label: "Re-Match & Follow-up", icon: RefreshCw },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, configError, signOut } = useAuth();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (!isLoginRoute && !loading && !session && !configError) {
      router.replace("/login");
    }
  }, [isLoginRoute, loading, session, configError, router]);

  // La pantalla de login se renderiza sin el shell (a pantalla completa).
  if (isLoginRoute) return <>{children}</>;

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg">
          <ErrorState message={configError} />
        </div>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Verificando sesión…" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

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
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
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

        <div className="space-y-2 border-t border-slate-200 p-3">
          <p
            className="truncate px-1 text-xs text-slate-500"
            title={session.user.email ?? undefined}
          >
            {session.user.email}
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-6 py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

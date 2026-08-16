import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ClipboardList,
  CreditCard,
  FlaskConical,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";

export const APP_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FlaskConical,
  KanbanSquare,
  RefreshCw,
  MessageSquare,
  CreditCard,
  Settings,
  Activity,
  ClipboardList,
  LogOut,
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: string;
  activeClass: string;
  idleClass: string;
  feature?: "aiChat" | "payments";
};

/** Estilos por módulo — sidebar Screening Intelligence */
export const APP_NAV_STYLES: Record<
  string,
  { activeClass: string; idleClass: string }
> = {
  "/dashboard": {
    activeClass: "bg-white/15 text-white ring-1 ring-white/25",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/patients": {
    activeClass: "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/protocols": {
    activeClass: "bg-fuchsia-400/20 text-fuchsia-100 ring-1 ring-fuchsia-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/tracker": {
    activeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/rematch": {
    activeClass: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/chat": {
    activeClass: "bg-violet-400/25 text-violet-100 ring-1 ring-violet-300/40",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/account/billing": {
    activeClass: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/settings": {
    activeClass: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
};

export function appIcon(name: string): LucideIcon {
  return APP_ICONS[name] ?? LayoutDashboard;
}

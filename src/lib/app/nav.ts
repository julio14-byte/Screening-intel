import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ClipboardList,
  CreditCard,
  Cpu,
  FileSpreadsheet,
  FlaskConical,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  ListChecks,
  ListTodo,
  Bell,
  Calendar,
  Package,
  Dices,
  Pill,
  Users,
  UserPlus,
} from "lucide-react";

export const APP_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserPlus,
  FlaskConical,
  KanbanSquare,
  RefreshCw,
  CreditCard,
  Settings,
  Activity,
  ClipboardList,
  LogOut,
  TrafficLight: ListChecks,
  ListTodo,
  Bell,
  Calendar,
  Package,
  Dices,
  Pill,
  FileSpreadsheet,
  Cpu,
};

export type NavSection = "screening" | "edc" | "epro" | "iwrs";

export type AppNavItem = {
  href: string;
  label: string;
  icon: string;
  section?: NavSection;
  activeClass: string;
  idleClass: string;
  feature?: "payments";
};

/** Estilos por módulo — sidebar Crisvia */
export const APP_NAV_STYLES: Record<
  string,
  { activeClass: string; idleClass: string }
> = {
  "/dashboard": {
    activeClass: "bg-white/15 text-white ring-1 ring-white/25",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/edc": {
    activeClass: "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/patients": {
    activeClass: "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/candidatos": {
    activeClass: "bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/cola": {
    activeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/avisos": {
    activeClass: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/agenda": {
    activeClass: "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/protocols": {
    activeClass: "bg-fuchsia-400/20 text-fuchsia-100 ring-1 ring-fuchsia-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/inventario": {
    activeClass: "bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/dispensacion": {
    activeClass: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/iwrs": {
    activeClass: "bg-violet-400/20 text-violet-100 ring-1 ring-violet-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/semaforos": {
    activeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/devices": {
    activeClass: "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/tracker": {
    activeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/epro": {
    activeClass: "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/rematch": {
    activeClass: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
  "/account/billing": {
    activeClass: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/30",
    idleClass: "text-violet-200 hover:bg-white/10 hover:text-white",
  },
};

export function groupNavItems<T extends { section?: string }>(
  items: T[]
): { section: string | null; items: T[] }[] {
  const groups: { section: string | null; items: T[] }[] = [];
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.items.push(item);
    } else {
      groups.push({ section, items: [item] });
    }
  }
  return groups;
}

export function appIcon(name: string): LucideIcon {
  return APP_ICONS[name] ?? LayoutDashboard;
}

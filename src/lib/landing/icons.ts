import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Dices,
  FileSpreadsheet,
  FlaskConical,
  KanbanSquare,
  ListTodo,
  Lock,
  MessageSquare,
  Package,
  Plug,
  RefreshCw,
  Square,
  Timer,
  UserX,
  Users,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Timer,
  FileSpreadsheet,
  UserX,
  Users,
  FlaskConical,
  KanbanSquare,
  ListTodo,
  Package,
  RefreshCw,
  MessageSquare,
  CreditCard,
  ClipboardList,
  Dices,
  CalendarCheck,
  Lock,
  Plug,
  Square,
};

export function landingIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Square;
}

import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  FileSpreadsheet,
  FlaskConical,
  KanbanSquare,
  RefreshCw,
  Sparkles,
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
  RefreshCw,
  Sparkles,
  CreditCard,
  Square,
};

export function landingIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Square;
}

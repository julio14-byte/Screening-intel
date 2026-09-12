import type { LucideIcon } from "lucide-react";
import {
  Cable,
  CreditCard,
  FileSpreadsheet,
  FlaskConical,
  Hospital,
  KanbanSquare,
  MessageSquare,
  RefreshCw,
  Scale,
  Shield,
  Square,
  Timer,
  UserX,
  Users,
  Workflow,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Timer,
  FileSpreadsheet,
  UserX,
  Users,
  FlaskConical,
  KanbanSquare,
  RefreshCw,
  MessageSquare,
  CreditCard,
  Shield,
  Scale,
  Workflow,
  Cable,
  Hospital,
  Square,
};

export function landingIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Square;
}

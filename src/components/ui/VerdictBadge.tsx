import { cn } from "@/lib/utils";
import type { MatchVerdict } from "@/lib/types";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";

const config: Record<
  MatchVerdict,
  { label: string; className: string; dot: string; Icon: typeof CircleCheck }
> = {
  eligible: {
    label: "Cumple",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CircleCheck,
  },
  pending: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    Icon: CircleAlert,
  },
  excluded: {
    label: "No cumple",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    Icon: CircleX,
  },
};

/** Semáforo visual de elegibilidad: 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple. */
export function VerdictBadge({ verdict }: { verdict: MatchVerdict }) {
  const { label, className, Icon } = config[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function VerdictDot({ verdict }: { verdict: MatchVerdict }) {
  const { label, dot } = config[verdict];
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", dot)}
      title={label}
      aria-label={label}
    />
  );
}

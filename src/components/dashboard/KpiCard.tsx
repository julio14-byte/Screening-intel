import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "amber" | "steel" | "success" | "violet";

const accents: Record<
  Accent,
  { ring: string; icon: string; bar: string; glow: string }
> = {
  amber: {
    ring: "ring-amber-200/80",
    icon: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    glow: "from-amber-200/40",
  },
  steel: {
    ring: "ring-slate-200/80",
    icon: "bg-slate-100 text-slate-600",
    bar: "bg-slate-500",
    glow: "from-slate-200/40",
  },
  success: {
    ring: "ring-emerald-200/80",
    icon: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    glow: "from-emerald-200/40",
  },
  violet: {
    ring: "ring-violet-200/80",
    icon: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
    glow: "from-violet-200/40",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "amber",
  trend,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: Accent;
  trend?: string;
}) {
  const a = accents[accent] ?? accents.amber;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-sm ring-1 transition hover:shadow-md",
        a.ring
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br to-transparent opacity-80",
          a.glow
        )}
      />
      <div className={cn("absolute left-0 top-0 h-1 w-full opacity-80", a.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-indigo-950">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-sm text-indigo-600/70">{subtitle}</p>
          ) : null}
          {trend ? (
            <p className="mt-2 text-xs font-medium text-indigo-400">{trend}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              a.icon
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </div>
        ) : null}
      </div>
    </article>
  );
}

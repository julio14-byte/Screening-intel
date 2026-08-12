import { cn } from "@/lib/utils";

/** Barra compacta de porcentaje de coincidencia. */
export function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped >= 60
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

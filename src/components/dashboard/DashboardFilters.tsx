"use client";

import { Search } from "lucide-react";
import type { MatchVerdict } from "@/lib/types";
import { TRAFFIC_LIGHT_LABELS } from "@/lib/dashboard/traffic-light";
import { cn } from "@/lib/utils";

export type TrafficLightFilter = MatchVerdict | "all";

type DashboardFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  trafficFilter: TrafficLightFilter;
  onTrafficFilterChange: (value: TrafficLightFilter) => void;
};

const FILTER_OPTIONS: { value: TrafficLightFilter; label: string; dot?: string }[] = [
  { value: "all", label: "Todos" },
  { value: "eligible", label: TRAFFIC_LIGHT_LABELS.eligible, dot: "bg-emerald-500" },
  { value: "pending", label: TRAFFIC_LIGHT_LABELS.pending, dot: "bg-amber-500" },
  { value: "excluded", label: TRAFFIC_LIGHT_LABELS.excluded, dot: "bg-rose-500" },
];

export function DashboardFilters({
  search,
  onSearchChange,
  trafficFilter,
  onTrafficFilterChange,
}: DashboardFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por paciente o protocolo…"
          className="w-full min-h-[44px] rounded-xl border border-violet-200 bg-white py-2.5 pl-10 pr-3 text-sm text-indigo-950 shadow-sm placeholder:text-indigo-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="Buscar pacientes"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const active = trafficFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTrafficFilterChange(option.value)}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "border-violet-300 bg-violet-100 text-violet-900"
                  : "border-violet-100 bg-white text-indigo-600 hover:border-violet-200 hover:bg-violet-50"
              )}
            >
              {option.dot ? (
                <span
                  className={cn("h-2 w-2 rounded-full", option.dot)}
                  aria-hidden
                />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

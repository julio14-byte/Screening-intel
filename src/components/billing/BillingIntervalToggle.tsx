"use client";

import type { ReactNode } from "react";
import type { BillingInterval } from "@/lib/billing/interval";
import { cn } from "@/lib/utils";

export function BillingIntervalToggle({
  value,
  onChange,
  tone = "app",
}: {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  tone?: "app" | "marketing";
}) {
  const dark = tone === "marketing";

  return (
    <div
      role="group"
      aria-label="Periodo de cobro"
      className={cn(
        "inline-flex rounded-full p-1 text-sm",
        dark ? "bg-white/10" : "bg-slate-100"
      )}
    >
      <IntervalButton
        active={value === "month"}
        dark={dark}
        onClick={() => onChange("month")}
      >
        Mensual
      </IntervalButton>
      <IntervalButton
        active={value === "year"}
        dark={dark}
        onClick={() => onChange("year")}
      >
        Anual
        <span
          className={cn(
            "ml-1.5 text-[10px] font-semibold uppercase tracking-wide",
            dark ? "text-violet-200" : "text-violet-600"
          )}
        >
          2 meses
        </span>
      </IntervalButton>
    </div>
  );
}

function IntervalButton({
  active,
  dark,
  onClick,
  children,
}: {
  active: boolean;
  dark: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
        active
          ? dark
            ? "bg-white text-violet-950"
            : "bg-white text-violet-900 ring-1 ring-violet-200"
          : dark
            ? "text-violet-100 hover:text-white"
            : "text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

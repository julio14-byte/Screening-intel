import type { Protocol } from "@/lib/types";
import { GENDER_LABELS } from "@/lib/utils";

function Chip({ text, tone }: { text: string; tone: "in" | "ex" }) {
  return (
    <span
      className={
        tone === "in"
          ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
          : "rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700"
      }
    >
      {text}
    </span>
  );
}

/** Resumen compacto de criterios de un protocolo en forma de chips. */
export function CriteriaSummary({ protocol }: { protocol: Protocol }) {
  const inc = protocol.inclusion_criteria ?? {};
  const exc = protocol.exclusion_criteria ?? {};
  const chips: { text: string; tone: "in" | "ex" }[] = [];

  if (inc.min_age != null || inc.max_age != null) {
    chips.push({
      text: `Edad ${inc.min_age ?? "–"}-${inc.max_age ?? "–"}`,
      tone: "in",
    });
  }
  if (inc.gender && inc.gender !== "any") {
    chips.push({ text: GENDER_LABELS[inc.gender], tone: "in" });
  }
  for (const c of inc.required_conditions ?? []) {
    chips.push({ text: c, tone: "in" });
  }
  for (const lab of inc.required_labs ?? []) {
    chips.push({
      text: `${lab.name}${lab.min != null ? ` ≥${lab.min}` : ""}${lab.max != null ? ` ≤${lab.max}` : ""}`,
      tone: "in",
    });
  }
  for (const c of exc.excluded_conditions ?? []) {
    chips.push({ text: `sin ${c}`, tone: "ex" });
  }
  for (const m of exc.excluded_medications ?? []) {
    chips.push({ text: `sin ${m}`, tone: "ex" });
  }

  if (chips.length === 0) {
    return <span className="text-xs text-slate-400">Sin criterios definidos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip, i) => (
        <Chip key={i} text={chip.text} tone={chip.tone} />
      ))}
    </div>
  );
}

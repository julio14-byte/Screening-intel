import { FlaskConical, UserRound } from "lucide-react";
import type { GapItem } from "@/lib/matching/missing-data";

export function PatientGaps({ gaps }: { gaps: GapItem[] }) {
  if (gaps.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
      <p className="text-xs font-semibold text-amber-950">Para calificar</p>
      <ul className="mt-1.5 space-y-1">
        {gaps.map((gap) => {
          const Icon = gap.kind === "lab" ? FlaskConical : UserRound;
          return (
            <li key={gap.key} className="flex items-start gap-2 text-xs text-amber-950">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
              <span>
                <span className="font-medium">{gap.label}</span>
                <span className="text-amber-800">
                  {" · "}
                  {gap.closes > 0
                    ? `cierra ${gap.closes} ${gap.closes === 1 ? "protocolo" : "protocolos"}`
                    : `suma a ${gap.protocols.length} ${gap.protocols.length === 1 ? "protocolo" : "protocolos"}`}
                  {" ("}
                  {gap.protocols.map((p) => p.code).join(", ")}
                  {")"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

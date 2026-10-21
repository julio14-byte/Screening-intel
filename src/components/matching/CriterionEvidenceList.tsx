import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { CriterionResult, CriterionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUPS: { status: CriterionStatus; title: string }[] = [
  { status: "pass", title: "Parece cumplirse" },
  { status: "fail", title: "No se cumple" },
  { status: "missing", title: "Requiere información" },
];

function StatusIcon({ status }: { status: CriterionStatus }) {
  if (status === "pass") {
    return <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />;
  }
  if (status === "fail") {
    return <CircleX className="h-3.5 w-3.5 text-rose-500" aria-hidden />;
  }
  return <CircleAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden />;
}

function CriterionRow({ result }: { result: CriterionResult }) {
  const evidence = result.evidence ?? [];
  return (
    <li className="flex items-start gap-2 py-1.5">
      <StatusIcon status={result.status} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-indigo-950">
          {result.criterion}
          <span
            className={cn(
              "ml-1.5 rounded px-1 py-px text-[10px] font-semibold uppercase",
              result.type === "inclusion"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            )}
          >
            {result.type === "inclusion" ? "Inclusión" : "Exclusión"}
          </span>
        </p>
        <p className="text-[11px] text-indigo-700">{result.detail}</p>
        {evidence.length > 0 ? (
          <p className="mt-0.5 text-[11px] text-slate-600">
            Evidencia en el expediente:{" "}
            {evidence.map((item, index) => (
              <span key={`${item}-${index}`}>
                {index > 0 ? " · " : null}
                <q>{item}</q>
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-amber-800">
            Sin evidencia citada en el expediente cargado.
          </p>
        )}
      </div>
    </li>
  );
}

/** Criterio por criterio, agrupado, con la evidencia que usó el motor. */
export function CriterionEvidenceList({
  details,
}: {
  details: CriterionResult[];
}) {
  if (details.length === 0) {
    return (
      <p className="py-1 text-xs text-indigo-400">
        El protocolo no tiene criterios definidos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const rows = details.filter((detail) => detail.status === group.status);
        if (rows.length === 0) return null;
        return (
          <section key={group.status}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group.title}{" "}
              <span className="tabular-nums text-slate-400">{rows.length}</span>
            </h4>
            <ul className="divide-y divide-violet-100">
              {rows.map((detail, index) => (
                <CriterionRow key={`${detail.criterion}-${index}`} result={detail} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

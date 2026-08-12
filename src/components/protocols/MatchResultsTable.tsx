"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  UserPlus,
} from "lucide-react";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { CriterionResult, MatchResult, Screening } from "@/lib/types";
import {
  calculateAge,
  cn,
  GENDER_LABELS,
  SCREENING_STATUS_LABELS,
} from "@/lib/utils";

function CriterionRow({ result }: { result: CriterionResult }) {
  const icon =
    result.status === "pass" ? (
      <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
    ) : result.status === "fail" ? (
      <CircleX className="h-3.5 w-3.5 text-rose-500" aria-hidden />
    ) : (
      <CircleAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden />
    );
  return (
    <li className="flex items-start gap-2 py-1">
      {icon}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700">
          {result.criterion}
          <span
            className={cn(
              "ml-1.5 rounded px-1 py-px text-[10px] font-semibold uppercase",
              result.type === "inclusion"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            )}
          >
            {result.type === "inclusion" ? "Inclusión" : "Exclusión"}
          </span>
        </p>
        <p className="text-[11px] text-slate-500">{result.detail}</p>
      </div>
    </li>
  );
}

export function MatchResultsTable({
  results,
  existing,
  onEnroll,
}: {
  results: MatchResult[];
  existing: Map<string, Screening>;
  onEnroll: (result: MatchResult) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnroll = async (result: MatchResult) => {
    setEnrolling(result.patient.id);
    try {
      await onEnroll(result);
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <th className="w-8 px-2 py-2.5" />
          <th className="px-3 py-2.5 font-medium">Paciente</th>
          <th className="px-3 py-2.5 font-medium">Edad / Sexo</th>
          <th className="px-3 py-2.5 font-medium">Semáforo</th>
          <th className="px-3 py-2.5 font-medium">Coincidencia</th>
          <th className="px-3 py-2.5 font-medium">Acción</th>
        </tr>
      </thead>
      <tbody>
        {results.map((result) => {
          const { patient } = result;
          const isOpen = expanded.has(patient.id);
          const screening = existing.get(patient.id);
          return (
            <Fragment key={patient.id}>
              <tr
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => toggle(patient.id)}
              >
                <td className="px-2 py-2.5 text-slate-400">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/patients/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-slate-900 hover:text-sky-700"
                  >
                    {patient.last_name}, {patient.first_name}
                  </Link>
                  {!result.profile ? (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Sin perfil clínico
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {calculateAge(patient.birth_date)} años ·{" "}
                  {GENDER_LABELS[patient.gender]}
                </td>
                <td className="px-3 py-2.5">
                  <VerdictBadge verdict={result.verdict} />
                </td>
                <td className="px-3 py-2.5">
                  <ScoreBar score={result.score} />
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  {screening ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                      {SCREENING_STATUS_LABELS[screening.status]}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        result.verdict === "excluded" ||
                        enrolling === patient.id
                      }
                      onClick={() => handleEnroll(result)}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      {enrolling === patient.id
                        ? "Agregando…"
                        : "A pre-screening"}
                    </button>
                  )}
                </td>
              </tr>
              {isOpen ? (
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <td colSpan={6} className="px-10 py-2">
                    {result.details.length === 0 ? (
                      <p className="py-1 text-xs text-slate-400">
                        El protocolo no tiene criterios definidos.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {result.details.map((d, i) => (
                          <CriterionRow key={i} result={d} />
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

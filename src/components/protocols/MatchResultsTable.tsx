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
        <p className="text-xs font-medium text-indigo-950">
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
        <p className="text-[11px] text-indigo-500">{result.detail}</p>
      </div>
    </li>
  );
}

function DetailsList({ details }: { details: CriterionResult[] }) {
  if (details.length === 0) {
    return (
      <p className="py-1 text-xs text-indigo-400">
        El protocolo no tiene criterios definidos.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-violet-100">
      {details.map((d, i) => (
        <CriterionRow key={i} result={d} />
      ))}
    </ul>
  );
}

function EnrollAction({
  result,
  screening,
  enrolling,
  onEnroll,
}: {
  result: MatchResult;
  screening: Screening | undefined;
  enrolling: string | null;
  onEnroll: (result: MatchResult) => Promise<void>;
}) {
  const { patient } = result;
  if (screening) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500">
        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
        {SCREENING_STATUS_LABELS[screening.status]}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={result.verdict === "excluded" || enrolling === patient.id}
      onClick={() => void onEnroll(result)}
      className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <UserPlus className="h-3.5 w-3.5" aria-hidden />
      {enrolling === patient.id ? "Agregando…" : "A pre-screening"}
    </button>
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
    <>
      {/* Móvil: cards */}
      <ul className="space-y-3 md:hidden">
        {results.map((result) => {
          const { patient } = result;
          const isOpen = expanded.has(patient.id);
          const screening = existing.get(patient.id);
          return (
            <li
              key={patient.id}
              className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => toggle(patient.id)}
              >
                <div className="min-w-0">
                  <Link
                    href={`/patients/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-indigo-950 hover:text-violet-700"
                  >
                    {patient.last_name}, {patient.first_name}
                  </Link>
                  <p className="mt-1 text-xs text-indigo-500">
                    {calculateAge(patient.birth_date)} años ·{" "}
                    {GENDER_LABELS[patient.gender]}
                  </p>
                  {!result.profile ? (
                    <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Sin perfil clínico
                    </span>
                  ) : null}
                </div>
                <VerdictBadge verdict={result.verdict} />
              </button>
              <div className="mt-3">
                <ScoreBar score={result.score} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <EnrollAction
                  result={result}
                  screening={screening}
                  enrolling={enrolling}
                  onEnroll={handleEnroll}
                />
                <button
                  type="button"
                  className="text-xs text-violet-600"
                  onClick={() => toggle(patient.id)}
                >
                  {isOpen ? "Ocultar criterios" : "Ver criterios"}
                </button>
              </div>
              {isOpen ? (
                <div className="mt-3 border-t border-violet-100 pt-3">
                  <DetailsList details={result.details} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-violet-100 bg-violet-50/60 text-xs uppercase tracking-wide text-indigo-600">
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
                    className="cursor-pointer border-b border-violet-50 hover:bg-violet-50/40"
                    onClick={() => toggle(patient.id)}
                  >
                    <td className="px-2 py-2.5 text-indigo-400">
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
                        className="font-medium text-indigo-950 hover:text-violet-700"
                      >
                        {patient.last_name}, {patient.first_name}
                      </Link>
                      {!result.profile ? (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Sin perfil clínico
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-indigo-600">
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
                      <EnrollAction
                        result={result}
                        screening={screening}
                        enrolling={enrolling}
                        onEnroll={handleEnroll}
                      />
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="border-b border-violet-50 bg-violet-50/30">
                      <td colSpan={6} className="px-10 py-2">
                        <DetailsList details={result.details} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

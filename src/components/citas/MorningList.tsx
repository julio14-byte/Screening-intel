"use client";

import Link from "next/link";
import { formatTime } from "@/lib/ops/visits";
import type { MorningListItem } from "@/lib/matching/morning-list";

export function MorningList({
  items,
  loading,
  blocked,
}: {
  items: MorningListItem[];
  loading: boolean;
  blocked: string | null;
}) {
  const noProtocols = items.length > 0 && items.every((item) => item.gap === "no_protocols");

  return (
    <section
      aria-labelledby="morning-list-heading"
      className="mb-5 rounded-xl border border-violet-100 bg-white"
    >
      <div className="border-b border-violet-100 px-4 py-3">
        <h2 id="morning-list-heading" className="text-sm font-semibold text-indigo-950">
          Lista de la mañana
        </h2>
      </div>

      {blocked ? (
        <p className="px-4 py-3 text-sm text-slate-600">{blocked}</p>
      ) : loading ? (
        <p className="px-4 py-3 text-sm text-slate-500">Comparando las citas de mañana…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">Mañana no hay citas agendadas.</p>
      ) : (
        <ul className="divide-y divide-violet-50">
          {items.map((item) => (
            <li
              key={item.visitId}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-950">
                  <time dateTime={item.scheduledAt}>{formatTime(item.scheduledAt)}</time>
                  <span className="text-slate-400"> · </span>
                  {item.patientName}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{gapCopy(item, noProtocols)}</p>
              </div>
              {item.protocolId && item.protocolCode ? (
                <Link
                  href={`/protocols/${item.protocolId}/match`}
                  className="shrink-0 text-xs font-medium text-violet-700 hover:underline"
                  aria-label={`Ver matching de ${item.protocolCode}`}
                >
                  {item.protocolCode}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function gapCopy(item: MorningListItem, noProtocols: boolean): string {
  if (noProtocols || item.gap === "no_protocols") {
    return "No hay protocolos activos para comparar.";
  }
  const code = item.protocolCode ?? "el protocolo";
  switch (item.gap) {
    case "eligible":
      return `Parece cumplir ${code}. No queda un criterio pendiente en la ficha.`;
    case "pending":
      return item.criterion
        ? `En ${code} todavía falta: ${item.criterion}.`
        : `En ${code} falta información de la ficha.`;
    case "excluded":
      return item.criterion
        ? `Ningún protocolo activo parece calzar. En ${code} no se cumple: ${item.criterion}.`
        : "Ningún protocolo activo parece calzar.";
    case "no_chart":
      return "Sin ficha clínica para comparar.";
    default:
      return "No hay protocolos activos para comparar.";
  }
}

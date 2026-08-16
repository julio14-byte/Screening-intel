"use client";

import Link from "next/link";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { screeningToVerdict } from "@/lib/dashboard/traffic-light";
import type { ScreeningWithRelations } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type DashboardPatientsTableProps = {
  rows: ScreeningWithRelations[];
};

export function DashboardPatientsTable({ rows }: DashboardPatientsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center text-sm text-indigo-600">
        No hay pacientes que coincidan con los filtros actuales.
      </p>
    );
  }

  return (
    <>
      {/* Vista móvil: cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((screening) => {
          const verdict = screeningToVerdict(screening);
          const patientName = `${screening.patients.last_name}, ${screening.patients.first_name}`;

          return (
            <li
              key={screening.id}
              className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/patients/${screening.patient_id}`}
                    className="font-medium text-indigo-950 hover:text-violet-700"
                  >
                    {patientName}
                  </Link>
                  <p className="mt-1 text-xs text-indigo-500">
                    {screening.protocols.code_name}
                  </p>
                </div>
                <VerdictBadge verdict={verdict} />
              </div>
              <p className="mt-3 text-[11px] text-indigo-400">
                Actualizado {formatDate(screening.updated_at)}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Vista desktop: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-violet-100 bg-violet-50/60 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Semáforo</th>
              <th className="px-4 py-3">Última actualización</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-50">
            {rows.map((screening) => {
              const verdict = screeningToVerdict(screening);
              const patientName = `${screening.patients.last_name}, ${screening.patients.first_name}`;

              return (
                <tr key={screening.id} className="hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${screening.patient_id}`}
                      className="font-medium text-indigo-950 hover:text-violet-700"
                    >
                      {patientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-indigo-700">
                    <span className="font-medium">
                      {screening.protocols.code_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-indigo-400">
                      {screening.protocols.title}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={verdict} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-indigo-500">
                    {formatDate(screening.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

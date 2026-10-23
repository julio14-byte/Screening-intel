"use client";

import Link from "next/link";
import { useState } from "react";
import { useRole } from "@/contexts/role-context";
import { studySubjectCaption } from "@/lib/profile/demographics";
import { canSetScreeningStatus } from "@/lib/rbac/screening-transitions";
import type { ScreeningStatus, ScreeningWithRelations } from "@/lib/types";
import {
  formatDate,
  SCREENING_STATUS_LABELS,
  SCREENING_STATUS_ORDER,
} from "@/lib/utils";

const selectClasses =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function isScreeningStatus(value: string): value is ScreeningStatus {
  return (SCREENING_STATUS_ORDER as readonly string[]).includes(value);
}

export function PipelineList({
  screenings,
  onMove,
}: {
  screenings: ScreeningWithRelations[];
  onMove: (
    id: string,
    status: ScreeningStatus,
    failureReason?: string
  ) => void;
}) {
  const { role, isReadOnly } = useRole();
  const [pendingFailureId, setPendingFailureId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const canMoveTo = (status: ScreeningStatus) =>
    !isReadOnly && role ? canSetScreeningStatus(role, status) : false;
  const canEdit = SCREENING_STATUS_ORDER.some(canMoveTo);

  const requestStatus = (id: string, status: ScreeningStatus) => {
    const current = screenings.find((row) => row.id === id);
    if (!current || current.status === status || !canMoveTo(status)) return;
    if (status === "screen_failure") {
      setPendingFailureId(id);
      setReason(current.failure_reason ?? "");
      setReasonError(null);
      return;
    }
    onMove(id, status);
  };

  const confirmFailure = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      setReasonError("Escribe el motivo con al menos 8 caracteres.");
      return;
    }
    if (!pendingFailureId) return;
    onMove(pendingFailureId, "screen_failure", trimmed);
    setPendingFailureId(null);
    setReason("");
    setReasonError(null);
  };

  const cancelFailure = () => {
    setPendingFailureId(null);
    setReason("");
    setReasonError(null);
  };

  if (screenings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center text-sm text-indigo-600">
        Sin pacientes en el pipeline.
      </p>
    );
  }

  return (
    <>
      {!canEdit ? (
        <p className="mb-3 text-xs text-indigo-600">
          Tu rol ve el pipeline y no cambia la etapa.
        </p>
      ) : null}

      <ul className="space-y-3 md:hidden">
        {screenings.map((screening) => (
          <PipelineCard
            key={screening.id}
            screening={screening}
            canEdit={canEdit}
            onStatus={requestStatus}
          />
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-violet-100 bg-violet-50/60 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-50">
            {screenings.map((screening) => (
              <PipelineRow
                key={screening.id}
                screening={screening}
                canEdit={canEdit}
                onStatus={requestStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      {pendingFailureId ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            onSubmit={(event) => {
              event.preventDefault();
              confirmFailure();
            }}
          >
            <h3 className="text-sm font-semibold text-slate-900">
              Motivo del screen failure
            </h3>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={4}
              required
              autoFocus
              placeholder="Ej. HbA1c por encima del máximo del protocolo"
              className="mt-3 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
            {reasonError ? (
              <p className="mt-2 text-xs text-rose-700">{reasonError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelFailure}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800"
              >
                Registrar y mover
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function PipelineCard({
  screening,
  canEdit,
  onStatus,
}: {
  screening: ScreeningWithRelations;
  canEdit: boolean;
  onStatus: (id: string, status: ScreeningStatus) => void;
}) {
  const patientName = `${screening.patients.last_name}, ${screening.patients.first_name}`;
  const subject = studySubjectCaption(screening.patients);

  return (
    <li className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <Link
        href={`/patients/${screening.patient_id}`}
        className="font-medium text-indigo-950 hover:text-violet-700"
      >
        {patientName}
      </Link>
      {subject ? (
        <p className="mt-0.5 font-mono text-[11px] text-indigo-600">{subject}</p>
      ) : null}
      <p className="mt-1 text-xs text-indigo-500">{screening.protocols.code_name}</p>
      <p className="mt-2 text-[11px] tabular-nums text-indigo-500">
        Match {Math.round(Number(screening.match_score))}%
      </p>
      <div className="mt-3">
        <StatusSelect
          screening={screening}
          patientName={patientName}
          canEdit={canEdit}
          onStatus={onStatus}
        />
      </div>
      <FailureNote screening={screening} />
      <p className="mt-3 text-[11px] text-indigo-400">
        Actualizado {formatDate(screening.updated_at)}
      </p>
    </li>
  );
}

function PipelineRow({
  screening,
  canEdit,
  onStatus,
}: {
  screening: ScreeningWithRelations;
  canEdit: boolean;
  onStatus: (id: string, status: ScreeningStatus) => void;
}) {
  const patientName = `${screening.patients.last_name}, ${screening.patients.first_name}`;
  const subject = studySubjectCaption(screening.patients);

  return (
    <tr className="hover:bg-violet-50/40">
      <td className="px-4 py-3">
        <Link
          href={`/patients/${screening.patient_id}`}
          className="font-medium text-indigo-950 hover:text-violet-700"
        >
          {patientName}
        </Link>
        {subject ? (
          <span className="mt-0.5 block font-mono text-[11px] text-indigo-500">
            {subject}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-indigo-700">
        <span className="font-medium">{screening.protocols.code_name}</span>
        <span className="mt-0.5 block text-xs text-indigo-400">
          {screening.protocols.title}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-indigo-700">
        {Math.round(Number(screening.match_score))}%
      </td>
      <td className="px-4 py-3">
        <StatusSelect
          screening={screening}
          patientName={patientName}
          canEdit={canEdit}
          onStatus={onStatus}
        />
        <FailureNote screening={screening} />
      </td>
      <td className="px-4 py-3 tabular-nums text-indigo-500">
        {formatDate(screening.updated_at)}
      </td>
    </tr>
  );
}

function StatusSelect({
  screening,
  patientName,
  canEdit,
  onStatus,
}: {
  screening: ScreeningWithRelations;
  patientName: string;
  canEdit: boolean;
  onStatus: (id: string, status: ScreeningStatus) => void;
}) {
  const { role, isReadOnly } = useRole();
  const options = SCREENING_STATUS_ORDER.filter((status) => {
    if (status === screening.status) return true;
    if (isReadOnly || !role) return false;
    return canSetScreeningStatus(role, status);
  });

  return (
    <select
      aria-label={`Etapa de ${patientName}`}
      value={screening.status}
      disabled={!canEdit}
      onChange={(event) => {
        const next = event.target.value;
        if (!isScreeningStatus(next)) return;
        onStatus(screening.id, next);
      }}
      className={selectClasses}
    >
      {options.map((status) => (
        <option key={status} value={status}>
          {SCREENING_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

function FailureNote({ screening }: { screening: ScreeningWithRelations }) {
  if (screening.status !== "screen_failure") return null;
  return (
    <p className="mt-1 max-w-xs truncate text-[11px] text-rose-700">
      {screening.failure_reason?.trim()
        ? screening.failure_reason
        : "Falta el motivo"}
    </p>
  );
}

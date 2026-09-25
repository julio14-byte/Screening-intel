"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/Field";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { studySubjectCaption } from "@/lib/profile/demographics";
import type { IwrsConfig } from "@/lib/iwrs/model";
import { formatDate } from "@/lib/utils";
import { useScreenings } from "@/hooks/useScreenings";

type AssignmentRow = {
  id: string;
  screening_id: string;
  patient_id: string;
  protocol_id: string;
  kit_code: string;
  stratum: string;
  randomized_at: string;
  unblinded_at: string | null;
  arm_visible: boolean;
  arm_code: string | null;
  arm_name: string | null;
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
};

export function IwrsBoard() {
  const { hasPermission, isReadOnly } = useRole();
  const canRandomize = hasPermission("screenings:write") && !isReadOnly;
  const canUnblind = hasPermission("screenings:approve") && !isReadOnly;
  const { screenings, loading: screeningsLoading, refetch } = useScreenings({
    includeMatchDetails: false,
  });
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [configs, setConfigs] = useState<IwrsConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [unblindId, setUnblindId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/iwrs");
    const json = await readJsonResponse<{
      assignments?: AssignmentRow[];
      configs?: IwrsConfig[];
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar IWRS.");
    setAssignments(json?.assignments ?? []);
    setConfigs(json?.configs ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error IWRS.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const enabledIds = useMemo(
    () => new Set(configs.filter((c) => c.enabled).map((c) => c.protocol_id)),
    [configs]
  );

  const ready = screenings.filter(
    (row) => row.status === "screening" && enabledIds.has(row.protocol_id)
  );

  async function randomize(screeningId: string) {
    setWorkingId(screeningId);
    setError(null);
    try {
      const res = await fetch("/api/iwrs/randomize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screening_id: screeningId }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo randomizar.");
      await Promise.all([load(), refetch()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo randomizar.");
    } finally {
      setWorkingId(null);
    }
  }

  async function unblind() {
    if (!unblindId) return;
    setWorkingId(unblindId);
    setError(null);
    try {
      const res = await fetch("/api/iwrs/unblind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ randomization_id: unblindId, reason }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo desenmascarar.");
      setUnblindId(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desenmascarar.");
    } finally {
      setWorkingId(null);
    }
  }

  if (loading || screeningsLoading) return <LoadingState label="Cargando IWRS…" />;

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader
          title="Listos para randomizar"
          description="Pacientes en Screening de un protocolo con IWRS activo. El motor de reglas ya filtró; esto solo asigna kit/brazo."
          actions={<Dices className="h-4 w-4 text-violet-500" aria-hidden />}
        />
        <CardBody>
          {ready.length === 0 ? (
            <EmptyState
              title="Nadie en cola IWRS"
              description="Pasá al paciente a Screening en el tracker y activá IWRS en el protocolo (brazos + IWRS activo)."
              action={
                <span className="flex flex-wrap gap-3">
                  <Link href="/tracker" className="text-xs font-medium text-sky-700">
                    Ir al tracker →
                  </Link>
                  <Link href="/protocols" className="text-xs font-medium text-sky-700">
                    Configurar IWRS en el protocolo →
                  </Link>
                </span>
              }
            />
          ) : (
            <ul className="space-y-2">
              {ready.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-100 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-indigo-950">
                      {row.patients.last_name}, {row.patients.first_name}
                    </p>
                    <p className="font-mono text-[11px] text-violet-600">
                      {studySubjectCaption(row.patients) ?? "Sin código"} ·{" "}
                      {row.protocols.code_name}
                    </p>
                  </div>
                  {canRandomize ? (
                    <Button
                      disabled={workingId === row.id}
                      onClick={() => void randomize(row.id)}
                    >
                      <Dices className="h-4 w-4" aria-hidden />
                      {workingId === row.id ? "Asignando…" : "Randomizar"}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">Solo lectura</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Asignaciones"
          description="El kit identifica al sujeto en farmacia. El brazo se muestra según el cegamiento."
        />
        <CardBody>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay randomizaciones IWRS.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-2 py-2">Kit</th>
                    <th className="px-2 py-2">Paciente</th>
                    <th className="px-2 py-2">Protocolo</th>
                    <th className="px-2 py-2">Brazo</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-mono text-xs">{row.kit_code}</td>
                      <td className="px-2 py-2">
                        <Link
                          href={`/patients/${row.patient_id}`}
                          className="font-medium text-indigo-950 hover:text-violet-700"
                        >
                          {row.patient_name}
                        </Link>
                        {row.subject_code ? (
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                            Sujeto {row.subject_code}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-xs">{row.protocol_code}</td>
                      <td className="px-2 py-2 text-xs">
                        {row.arm_visible
                          ? `${row.arm_code} · ${row.arm_name}`
                          : row.unblinded_at
                            ? "Desenmascarado"
                            : "Oculto (ciego)"}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-500">
                        {formatDate(row.randomized_at)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {canUnblind && !row.unblinded_at ? (
                          <Button
                            variant="ghost"
                            onClick={() => setUnblindId(row.id)}
                          >
                            Desenmascarar
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {unblindId ? (
        <Card>
          <CardHeader
            title="Desenlace de emergencia"
            description="Solo PI / sub-investigador. Queda en bitácora. No uses esto para curiosidad."
          />
          <CardBody className="space-y-3">
            <TextArea
              label="Motivo clínico"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: reacción adversa grave, necesidad de tratamiento de rescate…"
            />
            <div className="flex gap-2">
              <Button onClick={() => void unblind()} disabled={workingId === unblindId}>
                Confirmar desenlace
              </Button>
              <Button variant="secondary" onClick={() => setUnblindId(null)}>
                Cancelar
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

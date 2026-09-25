"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextArea, TextInput, SelectInput } from "@/components/ui/Field";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import {
  fetchIwrsCatalog,
  postIwrsRandomize,
  postIwrsSponsorKit,
  postIwrsUnblind,
  type IwrsCatalogAssignment,
} from "@/lib/iwrs/client";
import { studySubjectCaption } from "@/lib/profile/demographics";
import type { IwrsConfig, ProtocolArm } from "@/lib/iwrs/model";
import { isSponsorIwrs, sponsorVendorLabel } from "@/lib/iwrs/model";
import { formatDate } from "@/lib/utils";
import { useScreenings } from "@/hooks/useScreenings";

export function IwrsBoard() {
  const { hasPermission, isReadOnly } = useRole();
  const canRandomize = hasPermission("screenings:write") && !isReadOnly;
  const canUnblind = hasPermission("screenings:approve") && !isReadOnly;
  const { screenings, loading: screeningsLoading, refetch } = useScreenings({
    includeMatchDetails: false,
  });
  const [assignments, setAssignments] = useState<IwrsCatalogAssignment[]>([]);
  const [configs, setConfigs] = useState<IwrsConfig[]>([]);
  const [arms, setArms] = useState<ProtocolArm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [unblindId, setUnblindId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [kitDrafts, setKitDrafts] = useState<
    Record<string, { kit: string; externalId: string; armId: string }>
  >({});

  const load = useCallback(async () => {
    const json = await fetchIwrsCatalog();
    setAssignments(json.assignments);
    setConfigs(json.configs);
    setArms(json.arms);
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

  const configByProtocol = useMemo(() => {
    const map = new Map<string, IwrsConfig>();
    for (const config of configs) map.set(config.protocol_id, config);
    return map;
  }, [configs]);

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
      await postIwrsRandomize(screeningId);
      await Promise.all([load(), refetch()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo randomizar.");
    } finally {
      setWorkingId(null);
    }
  }

  async function registerSponsor(screeningId: string) {
    const draft = kitDrafts[screeningId] ?? { kit: "", externalId: "", armId: "" };
    setWorkingId(screeningId);
    setError(null);
    try {
      await postIwrsSponsorKit({
        screening_id: screeningId,
        kit_code: draft.kit,
        external_id: draft.externalId,
        arm_id: draft.armId || null,
      });
      setKitDrafts((prev) => {
        const next = { ...prev };
        delete next[screeningId];
        return next;
      });
      await Promise.all([load(), refetch()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el kit.");
    } finally {
      setWorkingId(null);
    }
  }

  async function unblind() {
    if (!unblindId) return;
    setWorkingId(unblindId);
    setError(null);
    try {
      await postIwrsUnblind(unblindId, reason);
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
          description="Pacientes en Screening. Este tablero consume /api/iwrs; el matcher no asigna kit."
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
            <ul className="space-y-3">
              {ready.map((row) => {
                const config = configByProtocol.get(row.protocol_id);
                const sponsor = isSponsorIwrs(config);
                const draft = kitDrafts[row.id] ?? {
                  kit: "",
                  externalId: "",
                  armId: "",
                };
                const protocolArms = arms.filter(
                  (arm) => arm.protocol_id === row.protocol_id
                );
                return (
                  <li
                    key={row.id}
                    className="space-y-2 rounded-md border border-violet-100 bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-indigo-950">
                          {row.patients.last_name}, {row.patients.first_name}
                        </p>
                        <p className="font-mono text-[11px] text-violet-600">
                          {studySubjectCaption(row.patients) ?? "Sin código"} ·{" "}
                          {row.protocols.code_name}
                          {sponsor
                            ? ` · ${sponsorVendorLabel(config?.sponsor_vendor)}`
                            : ""}
                        </p>
                      </div>
                      {canRandomize && !sponsor ? (
                        <Button
                          disabled={workingId === row.id}
                          onClick={() => void randomize(row.id)}
                        >
                          <Dices className="h-4 w-4" aria-hidden />
                          {workingId === row.id ? "Asignando…" : "Randomizar"}
                        </Button>
                      ) : null}
                      {!canRandomize ? (
                        <span className="text-xs text-slate-400">Solo lectura</span>
                      ) : null}
                    </div>
                    {sponsor && canRandomize ? (
                      <div className="grid gap-2 sm:grid-cols-4">
                        <TextInput
                          label="Kit del IRT"
                          value={draft.kit}
                          onChange={(e) =>
                            setKitDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, kit: e.target.value },
                            }))
                          }
                          placeholder="Ej. LLY-00421"
                        />
                        <TextInput
                          label="ID de randomización"
                          value={draft.externalId}
                          onChange={(e) =>
                            setKitDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, externalId: e.target.value },
                            }))
                          }
                          placeholder="Opcional"
                        />
                        {config?.blinding === "open" && protocolArms.length > 0 ? (
                          <SelectInput
                            label="Brazo (si el IRT lo muestra)"
                            value={draft.armId}
                            onChange={(e) =>
                              setKitDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, armId: e.target.value },
                              }))
                            }
                          >
                            <option value="">Sin brazo</option>
                            {protocolArms.map((arm) => (
                              <option key={arm.id} value={arm.id}>
                                {arm.code} · {arm.name}
                              </option>
                            ))}
                          </SelectInput>
                        ) : (
                          <p className="self-end text-[11px] text-slate-500">
                            Estudio ciego: solo se guarda el kit.
                          </p>
                        )}
                        <div className="flex items-end">
                          <Button
                            disabled={workingId === row.id || draft.kit.trim().length < 3}
                            onClick={() => void registerSponsor(row.id)}
                          >
                            {workingId === row.id ? "Registrando…" : "Registrar kit"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
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
                    <th className="px-2 py-2">Origen</th>
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
                      <td className="px-2 py-2 text-xs text-slate-500">
                        {row.assignment_source === "sponsor"
                          ? `Sponsor${row.external_id ? ` · ${row.external_id}` : ""}`
                          : "Centro"}
                      </td>
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

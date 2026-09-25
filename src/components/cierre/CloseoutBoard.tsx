"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextArea, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import {
  ANALYSIS_DISCLAIMER,
  CLOSEOUT_PHASE_HINT,
  CLOSEOUT_PHASE_LABEL,
  CLOSEOUT_PHASES,
  LOCK_ATTESTATION_HINT,
  REGULATORY_AGENCIES,
  phaseReached,
  type AnalysisSnapshot,
  type CloseoutPhase,
  type CloseoutQuery,
  type CloseoutScan,
  type ProtocolCloseout,
} from "@/lib/cierre/model";
import {
  canAnswerCloseoutQuery,
  canCloseCloseoutQuery,
  canLeadCloseout,
  canOpenCloseoutQuery,
  type AppRole,
} from "@/lib/rbac/types";

type ProtocolRow = {
  id: string;
  title: string;
  code_name: string;
  phase: CloseoutPhase;
};

type Detail = {
  protocol: { id: string; title: string; code_name: string };
  closeout: ProtocolCloseout;
  scan: CloseoutScan;
  queries: CloseoutQuery[];
  role: AppRole;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function CloseoutBoard({ initialProtocolId }: { initialProtocolId?: string }) {
  const { role } = useRole();
  const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
  const [protocolId, setProtocolId] = useState(initialProtocolId ?? "");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/cierre");
    const json = await readJsonResponse<{ protocols?: ProtocolRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el cierre.");
    setProtocols(json?.protocols ?? []);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/cierre?protocol_id=${id}`);
    const json = await readJsonResponse<Detail & { error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el protocolo.");
    setDetail(json as Detail);
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(async () => {
        await loadList();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error."))
      .finally(() => setLoading(false));
  }, [loadList]);

  useEffect(() => {
    if (!protocolId) {
      setDetail(null);
      return;
    }
    void Promise.resolve()
      .then(() => loadDetail(protocolId))
      .catch((err) => setError(err instanceof Error ? err.message : "Error."));
  }, [protocolId, loadDetail]);

  useEffect(() => {
    if (!protocolId && initialProtocolId) setProtocolId(initialProtocolId);
  }, [initialProtocolId, protocolId]);

  async function refresh() {
    await loadList();
    if (protocolId) await loadDetail(protocolId);
  }

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Cargando cierre de estudio…" />;

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardHeader
          title="Protocolo a cerrar"
          description="Limpieza → Database Lock → apertura del ciego → análisis descriptivo → CSR → registro regulatorio. Crisvia no envía expedientes a agencias ni reemplaza SAS/R."
          actions={<Lock className="h-4 w-4 text-slate-500" aria-hidden />}
        />
        <CardBody>
          {protocols.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay protocolos en el centro. Creá uno en{" "}
              <Link href="/protocols" className="text-violet-700 hover:underline">
                /protocols
              </Link>
              .
            </p>
          ) : (
            <label className="block text-xs font-medium text-slate-700">
              Protocolo
              <select
                className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950"
                value={protocolId}
                onChange={(event) => setProtocolId(event.target.value)}
              >
                <option value="">Elegí un protocolo</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.code_name} · {CLOSEOUT_PHASE_LABEL[protocol.phase]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardBody>
      </Card>
      {detail ? (
        <CloseoutDetail
          detail={detail}
          role={role ?? detail.role}
          busy={busy}
          onPost={post}
        />
      ) : null}
    </div>
  );
}

function CloseoutDetail({
  detail,
  role,
  busy,
  onPost,
}: {
  detail: Detail;
  role: AppRole;
  busy: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const phase = detail.closeout.phase;
  const lead = canLeadCloseout(role);
  const snapshot =
    detail.closeout.analysis_snapshot &&
    "n_randomized" in detail.closeout.analysis_snapshot
      ? (detail.closeout.analysis_snapshot as AnalysisSnapshot)
      : null;

  return (
    <>
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {CLOSEOUT_PHASES.map((item, index) => {
          const reached = phaseReached(phase, item);
          const current = phase === item;
          return (
            <li
              key={item}
              className={`rounded-lg border px-3 py-2 text-xs ${
                current
                  ? "border-violet-400 bg-violet-50 text-violet-900"
                  : reached
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <p className="font-semibold">{index + 1}. {CLOSEOUT_PHASE_LABEL[item].replace(/^\d+\.\s/, "")}</p>
            </li>
          );
        })}
      </ol>

      <CleaningStep
        detail={detail}
        role={role}
        busy={busy}
        lead={lead}
        onPost={onPost}
      />
      <UnblindStep detail={detail} busy={busy} lead={lead} onPost={onPost} />
      <AnalysisStep
        detail={detail}
        snapshot={snapshot}
        busy={busy}
        lead={lead}
        onPost={onPost}
      />
      <CsrStep detail={detail} snapshot={snapshot} busy={busy} lead={lead} onPost={onPost} />
      <SubmitStep detail={detail} busy={busy} lead={lead} onPost={onPost} />
    </>
  );
}

function CleaningStep({
  detail,
  role,
  busy,
  lead,
  onPost,
}: {
  detail: Detail;
  role: AppRole;
  busy: boolean;
  lead: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [fieldHint, setFieldHint] = useState("presión arterial");
  const [attestation, setAttestation] = useState(LOCK_ATTESTATION_HINT);
  const [answerById, setAnswerById] = useState<Record<string, string>>({});
  const locked = detail.closeout.phase !== "cleaning";

  async function openQuery(event: FormEvent) {
    event.preventDefault();
    await onPost("/api/cierre/query", {
      protocol_id: detail.protocol.id,
      field_hint: fieldHint,
      description,
    });
    setDescription("");
  }

  return (
    <Card>
      <CardHeader
        title={CLOSEOUT_PHASE_LABEL.cleaning}
        description={CLOSEOUT_PHASE_HINT.cleaning}
      />
      <CardBody className="space-y-4">
        {detail.scan.ready ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Escaneo limpio: no hay visitas programadas abiertas, ni signos vitales faltantes, ni queries sin cerrar.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
            {detail.scan.issues.map((issue) => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        )}

        {canOpenCloseoutQuery(role) && !locked ? (
          <form onSubmit={openQuery} className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Dato faltante"
              value={fieldHint}
              onChange={(event) => setFieldHint(event.target.value)}
              placeholder="presión arterial"
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Query para el centro"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="La visita V2 del sujeto 10001 no tiene presión arterial. Busquenla o justifiquenla."
              />
            </div>
            <div>
              <Button type="submit" disabled={busy || description.trim().length < 8}>
                Abrir query
              </Button>
            </div>
          </form>
        ) : null}

        {detail.queries.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay queries de monitoreo.</p>
        ) : (
          <ul className="space-y-3">
            {detail.queries.map((query) => {
              const patient = firstRel(
                (query as CloseoutQuery & { patients?: { subject_code: string | null } | { subject_code: string | null }[] })
                  .patients
              );
              return (
                <li key={query.id} className="rounded-lg border border-violet-100 px-3 py-2">
                  <p className="text-sm font-medium text-indigo-950">
                    {query.field_hint ? `${query.field_hint} · ` : ""}
                    {query.status}
                    {patient?.subject_code ? ` · sujeto ${patient.subject_code}` : ""}
                  </p>
                  <p className="text-xs text-slate-600">{query.description}</p>
                  {query.answer_notes ? (
                    <p className="mt-1 text-xs text-slate-500">Respuesta: {query.answer_notes}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canAnswerCloseoutQuery(role) && query.status === "open" && !locked ? (
                      <>
                        <input
                          className="min-w-[220px] flex-1 rounded-md border border-violet-200 px-2 py-1 text-xs"
                          placeholder="Dato encontrado o justificación"
                          value={answerById[query.id] ?? ""}
                          onChange={(event) =>
                            setAnswerById((current) => ({
                              ...current,
                              [query.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            onPost("/api/cierre/query/responder", {
                              id: query.id,
                              answer_notes: answerById[query.id] ?? "",
                            })
                          }
                        >
                          Responder
                        </Button>
                      </>
                    ) : null}
                    {canCloseCloseoutQuery(role) && query.status !== "closed" && !locked ? (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onPost("/api/cierre/query/cerrar", { id: query.id })}
                      >
                        Cerrar query
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {lead && !locked ? (
          <div className="space-y-2 border-t border-violet-100 pt-3">
            <p className="text-sm font-medium text-indigo-950">{CLOSEOUT_PHASE_LABEL.locked}</p>
            <p className="text-xs text-slate-500">{CLOSEOUT_PHASE_HINT.locked}</p>
            <TextArea
              label="Declaración irreversible"
              value={attestation}
              onChange={(event) => setAttestation(event.target.value)}
            />
            <Button
              disabled={busy || !detail.scan.ready || attestation.trim().length < 20}
              onClick={() =>
                onPost("/api/cierre/lock", {
                  protocol_id: detail.protocol.id,
                  attestation,
                })
              }
            >
              Bloquear la base
            </Button>
          </div>
        ) : locked ? (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Base bloqueada el {detail.closeout.locked_at ?? "—"}. Nadie puede alterar una celda.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            El investigador principal confirma el Database Lock cuando el escaneo esté limpio.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function UnblindStep({
  detail,
  busy,
  lead,
  onPost,
}: {
  detail: Detail;
  busy: boolean;
  lead: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const [reason, setReason] = useState("Apertura del ciego tras Database Lock.");
  const ready = detail.closeout.phase === "locked";
  const done = phaseReached(detail.closeout.phase, "unblinded");

  return (
    <Card>
      <CardHeader
        title={CLOSEOUT_PHASE_LABEL.unblinded}
        description={CLOSEOUT_PHASE_HINT.unblinded}
      />
      <CardBody className="space-y-3">
        {done && detail.closeout.phase !== "locked" ? (
          <p className="text-sm text-emerald-800">
            Ciego abierto el {detail.closeout.unblinded_at}. Motivo: {detail.closeout.unblind_reason}
          </p>
        ) : lead && ready ? (
          <>
            <TextArea
              label="Motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              disabled={busy || reason.trim().length < 8}
              onClick={() =>
                onPost("/api/cierre/unblind", {
                  protocol_id: detail.protocol.id,
                  reason,
                })
              }
            >
              Cruzar códigos con el brazo
            </Button>
          </>
        ) : (
          <p className="text-sm text-slate-500">Disponible solo después del Database Lock.</p>
        )}
        <p className="text-xs text-slate-400">
          El desenlace de emergencia de un sujeto sigue en /iwrs (PI/sub, motivo clínico). No esperes al lock si hay un evento de seguridad.
        </p>
      </CardBody>
    </Card>
  );
}

function AnalysisStep({
  detail,
  snapshot,
  busy,
  lead,
  onPost,
}: {
  detail: Detail;
  snapshot: AnalysisSnapshot | null;
  busy: boolean;
  lead: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const ready = detail.closeout.phase === "unblinded";
  const done = phaseReached(detail.closeout.phase, "analyzed");

  return (
    <Card>
      <CardHeader
        title={CLOSEOUT_PHASE_LABEL.analyzed}
        description={CLOSEOUT_PHASE_HINT.analyzed}
      />
      <CardBody className="space-y-3">
        <p className="text-xs text-slate-500">{ANALYSIS_DISCLAIMER}</p>
        {lead && (ready || done) ? (
          <Button
            disabled={busy || !(ready || done)}
            onClick={() => onPost("/api/cierre/analizar", { protocol_id: detail.protocol.id })}
          >
            {done ? "Recalcular snapshot" : "Generar snapshot del centro"}
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Primero hay que abrir el ciego.</p>
        )}
        {snapshot ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Randomizados {snapshot.n_randomized} · screen failures {snapshot.n_screen_failure} ·
              EA {snapshot.overall_ae_n} ({snapshot.overall_ae_pct ?? "—"}%) · adherencia media{" "}
              {snapshot.overall_mean_adherence ?? "—"}% · desviaciones {snapshot.overall_deviations}
            </p>
            <ul className="list-disc pl-5">
              {snapshot.arms.map((arm) => (
                <li key={arm.code}>
                  {arm.code} ({arm.name}): n={arm.n}, EA {arm.ae_pct ?? "—"}%, adherencia{" "}
                  {arm.mean_adherence ?? "—"}%
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function CsrStep({
  detail,
  snapshot,
  busy,
  lead,
  onPost,
}: {
  detail: Detail;
  snapshot: AnalysisSnapshot | null;
  busy: boolean;
  lead: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const ready = detail.closeout.phase === "analyzed";
  const done = phaseReached(detail.closeout.phase, "csr");

  return (
    <Card>
      <CardHeader
        title={CLOSEOUT_PHASE_LABEL.csr}
        description={CLOSEOUT_PHASE_HINT.csr}
      />
      <CardBody className="space-y-3">
        {lead && (ready || done) && snapshot ? (
          <Button
            disabled={busy}
            onClick={() => onPost("/api/cierre/csr", { protocol_id: detail.protocol.id })}
          >
            {done ? "Regenerar CSR del centro" : "Redactar CSR del centro"}
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Requiere el snapshot descriptivo.</p>
        )}
        {detail.closeout.csr_markdown ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {detail.closeout.csr_markdown}
          </pre>
        ) : null}
      </CardBody>
    </Card>
  );
}

function SubmitStep({
  detail,
  busy,
  lead,
  onPost,
}: {
  detail: Detail;
  busy: boolean;
  lead: boolean;
  onPost: (url: string, body: unknown) => Promise<void>;
}) {
  const [agencies, setAgencies] = useState<string[]>(["COFEPRIS"]);
  const [notes, setNotes] = useState("");
  const ready = detail.closeout.phase === "csr";
  const done = detail.closeout.phase === "submitted";

  const selected = useMemo(() => new Set(agencies), [agencies]);

  return (
    <Card>
      <CardHeader
        title={CLOSEOUT_PHASE_LABEL.submitted}
        description={CLOSEOUT_PHASE_HINT.submitted}
      />
      <CardBody className="space-y-3">
        {done ? (
          <p className="text-sm text-emerald-800">
            Registrado el {detail.closeout.submitted_at} para{" "}
            {detail.closeout.agencies.join(", ") || "—"}. Si aprueban, el medicamento entra a Fase IV
            (farmacovigilancia abierta) fuera de Crisvia.
          </p>
        ) : lead && ready ? (
          <>
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium text-slate-700">Agencias (registro, no envío)</legend>
              {REGULATORY_AGENCIES.map((agency) => (
                <label key={agency} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selected.has(agency)}
                    onChange={(event) => {
                      setAgencies((current) =>
                        event.target.checked
                          ? [...current, agency]
                          : current.filter((item) => item !== agency)
                      );
                    }}
                  />
                  {agency}
                </label>
              ))}
            </fieldset>
            <TextArea
              label="Notas"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="El sponsor presentará el expediente. Crisvia no es la puerta regulatoria."
            />
            <Button
              disabled={busy || agencies.length === 0}
              onClick={() =>
                onPost("/api/cierre/someter", {
                  protocol_id: detail.protocol.id,
                  agencies,
                  notes,
                })
              }
            >
              Registrar sometimiento
            </Button>
          </>
        ) : (
          <p className="text-sm text-slate-500">Generá el CSR del centro antes de registrar el paquete.</p>
        )}
      </CardBody>
    </Card>
  );
}

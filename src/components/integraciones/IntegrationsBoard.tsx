"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import { useProtocols } from "@/hooks/useProtocols";
import {
  INTEGRATION_KINDS,
  INTEGRATION_KIND_HINT,
  INTEGRATION_KIND_LABEL,
  type IntegrationKind,
  type IntegrationPublic,
} from "@/lib/integraciones/model";

type Delivery = {
  id: string;
  event_type: string;
  direction: string;
  http_status: number | null;
  error: string;
  created_at: string;
  protocol_integrations:
    | { kind: string; vendor: string }
    | { kind: string; vendor: string }[]
    | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function IntegrationsBoard({ initialProtocolId }: { initialProtocolId?: string }) {
  const { hasPermission, isReadOnly } = useRole();
  const canEdit = hasPermission("screenings:write") && !isReadOnly;
  const { protocols, loading: protocolsLoading } = useProtocols();
  const [protocolId, setProtocolId] = useState(initialProtocolId ?? "");
  const [integrations, setIntegrations] = useState<IntegrationPublic[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [kind, setKind] = useState<IntegrationKind>("edc");
  const [vendor, setVendor] = useState("");
  const [endpoint, setEndpoint] = useState("https://");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (id: string) => {
    const [intRes, delRes] = await Promise.all([
      fetch(`/api/integraciones?protocol_id=${id}`),
      fetch(`/api/integraciones/entregas?protocol_id=${id}`),
    ]);
    const intJson = await readJsonResponse<{
      integrations?: IntegrationPublic[];
      error?: string;
    }>(intRes);
    if (!intRes.ok) throw new Error(intJson?.error ?? "No se pudieron cargar las conexiones.");
    const delJson = await readJsonResponse<{ deliveries?: Delivery[]; error?: string }>(
      delRes
    );
    setIntegrations(intJson?.integrations ?? []);
    setDeliveries(delJson?.deliveries ?? []);
  }, []);

  useEffect(() => {
    if (!protocolId && initialProtocolId) setProtocolId(initialProtocolId);
  }, [initialProtocolId, protocolId]);

  useEffect(() => {
    if (!protocolId) return;
    void Promise.resolve()
      .then(() => load(protocolId))
      .catch((err) => setError(err instanceof Error ? err.message : "Error."));
  }, [protocolId, load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!protocolId) return;
    setSaving(true);
    setError(null);
    setSecretOnce(null);
    try {
      const res = await fetch("/api/integraciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_id: protocolId,
          kind,
          vendor,
          endpoint_url: endpoint,
        }),
      });
      const json = await readJsonResponse<{
        error?: string;
        signing_secret?: string;
      }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      setSecretOnce(json?.signing_secret ?? null);
      await load(protocolId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    try {
      const res = await fetch("/api/integraciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar.");
      if (protocolId) await load(protocolId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  if (protocolsLoading) return <LoadingState label="Cargando integraciones…" />;

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardHeader
          title="EDC, ePRO e IWRS de terceros"
          description="Crisvia es screening. Cuando un candidato queda elegible se dispara un POST firmado al webhook del proveedor. El IWRS del sponsor avisa acá (HMAC o Bearer) cuando asignó el kit. No es un conector Lilly/Medidata."
          actions={<Plug className="h-4 w-4 text-slate-500" aria-hidden />}
        />
        <CardBody>
          <SelectInput
            label="Protocolo"
            value={protocolId}
            onChange={(event) => setProtocolId(event.target.value)}
          >
            <option value="">Elegí un protocolo</option>
            {protocols.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.code_name} — {protocol.title}
              </option>
            ))}
          </SelectInput>
        </CardBody>
      </Card>

      {protocolId && canEdit ? (
        <Card>
          <CardHeader title="Nueva conexión o reemplazo" />
          <CardBody>
            <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
              <SelectInput
                label="Módulo de tercero"
                value={kind}
                onChange={(event) => setKind(event.target.value as IntegrationKind)}
              >
                {INTEGRATION_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {INTEGRATION_KIND_LABEL[item]}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Proveedor"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                placeholder="Castor, IQVIA, Suvoda…"
              />
              <div className="sm:col-span-2">
                <TextInput
                  label="Webhook HTTPS"
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  hint={INTEGRATION_KIND_HINT[kind]}
                />
              </div>
              <div>
                <Button type="submit" disabled={saving || vendor.trim().length < 2}>
                  Guardar conexión
                </Button>
              </div>
            </form>
            {secretOnce ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Secreto HMAC (una sola vez): <code className="break-all">{secretOnce}</code>
                <br />
                El tercero verifica <code>X-Crisvia-Signature</code> en los POST de Crisvia y firma
                igual (o manda <code>Authorization: Bearer</code>) en{" "}
                <code>POST /api/integraciones/inbound</code>.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {protocolId ? (
        <Card>
          <CardHeader title="Conexiones de este protocolo" />
          <CardBody>
            {integrations.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay webhooks.</p>
            ) : (
              <ul className="space-y-2">
                {integrations.map((row) => (
                  <li key={row.id} className="rounded-lg border border-violet-100 px-3 py-2">
                    <p className="text-sm font-semibold text-indigo-950">
                      {INTEGRATION_KIND_LABEL[row.kind]} · {row.vendor}{" "}
                      {row.active ? "" : "(inactiva)"}
                    </p>
                    <p className="break-all text-xs text-slate-500">{row.endpoint_url}</p>
                    {canEdit ? (
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-violet-700 hover:underline"
                        onClick={() => void toggleActive(row.id, row.active)}
                      >
                        {row.active ? "Pausar" : "Reactivar"}
                      </button>
                    ) : null}
                    {row.last_error ? (
                      <p className="text-xs text-rose-700">{row.last_error}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      {deliveries.length > 0 ? (
        <Card>
          <CardHeader title="Últimos eventos" />
          <CardBody>
            <ul className="space-y-1 text-xs text-slate-600">
              {deliveries.map((row) => {
                const rel = firstRel(row.protocol_integrations);
                return (
                  <li key={row.id}>
                    {row.created_at.slice(0, 19)} · {row.direction} · {rel?.kind} ·{" "}
                    {row.event_type} · HTTP {row.http_status ?? "—"}
                    {row.error ? ` · ${row.error}` : ""}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

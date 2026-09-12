"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type EhrLog = {
  id: string;
  sync_type: string;
  status: string;
  patients_created: number;
  patients_updated: number;
  patients_failed: number;
  rematch_refreshed: number;
  started_at: string;
  completed_at: string | null;
};

type EhrSettingsData = {
  organization: {
    id: string;
    name: string;
    ehr_enabled: boolean;
    ehr_source: string | null;
    has_webhook_secret: boolean;
    webhook_secret: string | null;
  };
  webhookUrl: string;
  batchSyncUrl: string;
  recentLogs: EhrLog[];
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="secondary" type="button" onClick={copy} className="shrink-0">
      {copied ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

export function EhrSettingsPanel() {
  const [data, setData] = useState<EhrSettingsData | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applySettings = useCallback((json: EhrSettingsData) => {
    setData(json);
    setEnabled(json.organization.ehr_enabled);
    setSource(json.organization.ehr_source ?? "");
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings/ehr");
    const json = await readJsonResponse<EhrSettingsData & { error?: string }>(
      res
    );
    if (!res.ok) throw new Error(json?.error ?? "Error al cargar.");
    if (!json) throw new Error("Respuesta vacía.");
    return json;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applySettings(await fetchSettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [applySettings, fetchSettings]);

  useEffect(() => {
    let cancelled = false;
    void fetchSettings()
      .then((json) => {
        if (!cancelled) applySettings(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applySettings, fetchSettings]);

  const save = async (extra?: { regenerate_secret?: boolean }) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/ehr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ehr_enabled: enabled,
          ehr_source: source.trim() || undefined,
          regenerate_secret: extra?.regenerate_secret,
        }),
      });
      const json = await readJsonResponse<
        EhrSettingsData & { error?: string }
      >(res);
      if (!res.ok) throw new Error(json?.error ?? "Error al guardar.");
      if (!json) throw new Error("Respuesta vacía.");
      setData((prev) => {
        const nextSecret =
          json.organization.webhook_secret ??
          prev?.organization.webhook_secret ??
          null;
        return {
          ...(prev ?? json),
          organization: {
            ...json.organization,
            webhook_secret: nextSecret,
          },
          webhookUrl: json.webhookUrl,
          batchSyncUrl: json.batchSyncUrl,
          recentLogs: prev?.recentLogs ?? json.recentLogs ?? [],
        };
      });
      setMessage(
        extra?.regenerate_secret
          ? "Secreto regenerado. Actualiza el middleware del EHR."
          : "Configuración EHR guardada."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <ErrorState message={error} />
        <Button type="button" variant="secondary" onClick={() => load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Integración EHR</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fase 1: sync batch vía API autenticada. Fase 2: webhook en tiempo
            real con firma HMAC cuando cambian labs o diagnósticos.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Habilitar recepción de webhooks EHR
        </label>

        <TextInput
          label="Sistema EHR"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="epic, cerner, fhir, custom…"
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => save({ regenerate_secret: true })}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden />
            Regenerar secreto
          </Button>
        </div>

        {message ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-medium">Webhook (Fase 2)</h3>
        <p className="text-xs text-muted-foreground">
          POST con headers{" "}
          <code className="text-xs">X-Organization-Id</code> y{" "}
          <code className="text-xs">X-EHR-Signature: sha256=&lt;hex&gt;</code>
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-2">
            {data.webhookUrl}
          </code>
          <CopyButton text={data.webhookUrl} />
        </div>
        <p className="text-xs text-muted-foreground">
          Organization ID:{" "}
          <code className="text-xs">{data.organization.id}</code>
        </p>
        {data.organization.webhook_secret ? (
          <div className="space-y-1">
            <p className="text-xs font-medium">Secreto webhook</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-2">
                {data.organization.webhook_secret}
              </code>
              <CopyButton text={data.organization.webhook_secret} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600">
            Guarda con webhooks habilitados para generar el secreto.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-medium">Sync batch (Fase 1)</h3>
        <p className="text-xs text-muted-foreground">
          POST autenticado (sesión + permiso patients:write). Upsert por{" "}
          <code className="text-xs">ehr_patient_id</code>.
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-2">
            {data.batchSyncUrl}
          </code>
          <CopyButton text={data.batchSyncUrl} />
        </div>
      </section>

      {data.recentLogs.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-medium">Últimas sincronizaciones</h3>
          <ul className="space-y-2 text-sm">
            {data.recentLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="font-medium capitalize">{log.sync_type}</span>
                <span>{log.status}</span>
                <span>
                  +{log.patients_created} / ~{log.patients_updated} / ✕
                  {log.patients_failed}
                </span>
                {log.rematch_refreshed > 0 ? (
                  <span className="text-emerald-600">re-match</span>
                ) : null}
                <span className="text-xs text-muted-foreground w-full">
                  {new Date(log.started_at).toLocaleString("es")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

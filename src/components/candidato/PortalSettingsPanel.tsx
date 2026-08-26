"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type PortalData = {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    portal_enabled: boolean;
  };
  protocols: { code_name: string; title: string }[];
  links: {
    siteUrl: string;
    protocolLinks: { code: string; url: string }[];
  };
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

export function PortalSettingsPanel() {
  const [data, setData] = useState<PortalData | null>(null);
  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/portal");
      const json = await readJsonResponse<PortalData & { error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "Error al cargar.");
      if (!json) throw new Error("Respuesta vacía.");
      setData(json);
      setSlug(json.organization.slug ?? "");
      setEnabled(json.organization.portal_enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal_enabled: enabled,
          slug: slug.trim().toLowerCase(),
        }),
      });
      const json = await readJsonResponse<PortalData & { error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "Error al guardar.");
      if (!json) throw new Error("Respuesta vacía.");
      setData(json);
      setMessage("Configuración guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-indigo-600">Cargando portal…</p>;
  }

  if (!data) {
    return error ? <ErrorState message={error} /> : null;
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      ) : null}

      <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-950">Activar portal</h3>
        <p className="mt-1 text-sm text-indigo-600">
          Los candidatos acceden por link público sin login de coordinador.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-violet-300"
          />
          Portal de candidatos activo
        </label>

        <div className="mt-4">
          <TextInput
            label="Slug del centro (URL pública)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="clinica-oncologia"
          />
          <p className="mt-1 text-xs text-indigo-500">
            Solo minúsculas, números y guiones. Ej: /candidato/clinica-oncologia
          </p>
        </div>

        <Button className="mt-4" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {enabled && data.links.siteUrl ? (
        <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-indigo-950">Links para compartir</h3>
          <p className="text-xs text-indigo-600">
            Los pacientes deben usar este código exacto en /candidato (o el link copiado).
          </p>

          <div>
            <p className="text-xs font-medium text-indigo-600">Centro (todos los estudios)</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="flex-1 rounded-lg bg-violet-50 px-3 py-2 text-xs text-indigo-900 break-all">
                {data.links.siteUrl}
              </code>
              <CopyButton text={data.links.siteUrl} />
              <a
                href={data.links.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
            </div>
          </div>

          {data.links.protocolLinks.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-indigo-600">Por estudio</p>
              {data.links.protocolLinks.map((link) => (
                <div key={link.code} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-indigo-800 w-20 shrink-0">
                    {link.code}
                  </span>
                  <code className="flex-1 rounded-lg bg-violet-50 px-3 py-2 text-xs text-indigo-900 break-all">
                    {link.url}
                  </code>
                  <CopyButton text={link.url} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-indigo-500">
          Activa el portal y guarda un slug para generar links.
        </p>
      )}
    </div>
  );
}

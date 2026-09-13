"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  OUTREACH_TEMPLATE_LABELS,
  type OutreachChannel,
  type OutreachRow,
  type OutreachTemplateKey,
} from "@/lib/candidato/outreachTemplates";

const TEMPLATES = Object.keys(OUTREACH_TEMPLATE_LABELS) as OutreachTemplateKey[];

type Channels = {
  sms: boolean;
  whatsappApi: boolean;
  whatsappLink: boolean;
};

export function CandidatoOutreachPanel({
  submissionId,
  hasPhone,
}: {
  submissionId: string;
  hasPhone: boolean;
}) {
  const { hasPermission, isReadOnly } = useRole();
  const canWrite = hasPermission("patients:write") && !isReadOnly;
  const [template, setTemplate] = useState<OutreachTemplateKey>("te_llamamos");
  const [channels, setChannels] = useState<Channels>({
    sms: false,
    whatsappApi: false,
    whatsappLink: true,
  });
  const [messages, setMessages] = useState<OutreachRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/candidatos/${submissionId}/mensaje`, {
        credentials: "include",
      });
      const data = await readJsonResponse<{
        channels?: Channels;
        messages?: OutreachRow[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el canal.");
      if (data?.channels) setChannels(data.channels);
      setMessages(data?.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar mensajes.");
    }
  }, [submissionId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function send(channel: OutreachChannel) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidatos/${submissionId}/mensaje`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, channel }),
      });
      const data = await readJsonResponse<{
        error?: string;
        waLink?: string;
        channels?: Channels;
      }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo enviar.");
      if (data?.channels) setChannels(data.channels);
      if (data?.waLink) window.open(data.waLink, "_blank", "noopener,noreferrer");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-950">
        <MessageCircle className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
        WhatsApp / SMS al candidato
      </p>
      <p className="mt-1 text-[11px] text-emerald-800">
        Plantillas fijas (te llamamos, trae receta, link del portal). No se manda el
        briefing de IA ni diagnósticos.
      </p>

      {!hasPhone ? (
        <p className="mt-2 text-xs text-amber-800">
          Este lead no dejó teléfono. Pídelo en la llamada o en el portal.
        </p>
      ) : (
        <>
          <fieldset className="mt-2 flex flex-wrap gap-2 text-xs text-emerald-950">
            <legend className="sr-only">Plantilla</legend>
            {TEMPLATES.map((key) => (
              <label key={key} className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name={`outreach-${submissionId}`}
                  checked={template === key}
                  onChange={() => setTemplate(key)}
                  disabled={busy || !canWrite}
                />
                {OUTREACH_TEMPLATE_LABELS[key]}
              </label>
            ))}
          </fieldset>

          {canWrite ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                disabled={busy}
                onClick={() => void send("whatsapp_link")}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Abrir WhatsApp
              </Button>
              <Button
                variant="secondary"
                className="text-xs"
                disabled={busy || !channels.whatsappApi}
                onClick={() => void send("whatsapp")}
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Enviar WhatsApp
              </Button>
              <Button
                className="text-xs"
                disabled={busy || !channels.sms}
                onClick={() => void send("sms")}
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Enviar SMS
              </Button>
            </div>
          ) : null}

          {!channels.sms || !channels.whatsappApi ? (
            <p className="mt-2 text-[11px] text-emerald-700">
              {!channels.sms
                ? "SMS: configura Twilio (TWILIO_SMS_FROM). "
                : ""}
              {!channels.whatsappApi
                ? "WhatsApp automático: TWILIO_WHATSAPP_FROM. Mientras tanto usa «Abrir WhatsApp»."
                : ""}
            </p>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {messages.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px] text-emerald-900">
          {messages.slice(0, 5).map((m) => (
            <li key={m.id}>
              {new Date(m.created_at).toLocaleString("es-419")} ·{" "}
              {OUTREACH_TEMPLATE_LABELS[m.template_key]} · {m.channel} ·{" "}
              {m.status === "sent"
                ? "enviado"
                : m.status === "opened_link"
                  ? "WhatsApp abierto"
                  : "falló"}
              {m.to_e164 ? ` · ${m.to_e164}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

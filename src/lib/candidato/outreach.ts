import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { normalizeE164 } from "@/lib/candidato/phone";
import {
  OUTREACH_TEMPLATES,
  buildOutreachMessage,
  whatsappDeepLink,
  type OutreachChannel,
  type OutreachRow,
  type OutreachTemplateKey,
} from "@/lib/candidato/outreachTemplates";
import { getTwilioConfig, sendTwilioMessage } from "@/lib/candidato/twilio";

export const outreachPostSchema = z.object({
  template: z.enum(OUTREACH_TEMPLATES),
  channel: z.enum(["sms", "whatsapp", "whatsapp_link"]),
});

type SubmissionRow = {
  id: string;
  organization_id: string;
  first_name: string;
  contact_phone: string | null;
  organizations: { name: string; slug: string | null } | { name: string; slug: string | null }[] | null;
};

function oneOrg(
  value: SubmissionRow["organizations"]
): { name: string; slug: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function outreachChannels() {
  const twilio = getTwilioConfig();
  return {
    sms: twilio.smsConfigured,
    whatsappApi: twilio.whatsappApiConfigured,
    whatsappLink: true,
  };
}

export async function listOutreach(
  submissionId: string
): Promise<OutreachRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidato_outreach")
    .select("id, channel, template_key, to_e164, status, error, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as OutreachRow[];
}

export async function sendCandidatoOutreach(input: {
  userId: string;
  submissionId: string;
  template: OutreachTemplateKey;
  channel: OutreachChannel;
}): Promise<{
  message: OutreachRow;
  preview: string;
  waLink?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_screen_submissions")
    .select("id, organization_id, first_name, contact_phone, organizations(name, slug)")
    .eq("id", input.submissionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Candidato no encontrado.");

  const row = data as unknown as SubmissionRow;
  let org = oneOrg(row.organizations);
  if (!org) {
    const { data: orgRow, error: orgError } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (orgError) throw new Error(orgError.message);
    org = orgRow;
  }
  if (!org?.slug) {
    throw new Error("El centro no tiene slug de portal. Configúralo en Ajustes → Portal.");
  }

  const toE164 = normalizeE164(row.contact_phone ?? "");
  const preview = buildOutreachMessage({
    template: input.template,
    firstName: row.first_name,
    siteName: org.name,
    orgSlug: org.slug,
  });

  const twilio = getTwilioConfig();
  let status: OutreachRow["status"] = "sent";
  let providerSid: string | null = null;
  let sendError: string | null = null;
  let waLink: string | undefined;

  if (input.channel === "whatsapp_link") {
    status = "opened_link";
    waLink = whatsappDeepLink(toE164, preview);
  } else if (input.channel === "sms") {
    if (!twilio.smsConfigured) {
      throw new Error(
        "SMS no configurado. En .env.local agrega TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_SMS_FROM."
      );
    }
    try {
      const sent = await sendTwilioMessage({
        toE164,
        from: twilio.smsFrom,
        body: preview,
        whatsapp: false,
      });
      providerSid = sent.sid;
    } catch (err) {
      status = "failed";
      sendError = err instanceof Error ? err.message : "Error al enviar SMS.";
    }
  } else {
    if (!twilio.whatsappApiConfigured) {
      throw new Error(
        "WhatsApp API no configurada. Usa «Abrir WhatsApp» o define TWILIO_WHATSAPP_FROM."
      );
    }
    try {
      const sent = await sendTwilioMessage({
        toE164,
        from: twilio.whatsappFrom,
        body: preview,
        whatsapp: true,
      });
      providerSid = sent.sid;
    } catch (err) {
      status = "failed";
      sendError = err instanceof Error ? err.message : "Error al enviar WhatsApp.";
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("candidato_outreach")
    .insert({
      organization_id: row.organization_id,
      submission_id: row.id,
      channel: input.channel,
      template_key: input.template,
      to_e164: toE164,
      status,
      provider_sid: providerSid,
      error: sendError,
      created_by: input.userId,
    })
    .select("id, channel, template_key, to_e164, status, error, created_at")
    .single();
  if (insertError) throw new Error(insertError.message);

  const message = inserted as OutreachRow;

  await recordCustomAuditEvent({
    tableName: "candidato_outreach",
    recordId: message.id,
    description: `Mensaje ${input.template} por ${input.channel} (${status}).`,
    userId: input.userId,
    metadata: {
      event_type: "candidato_outreach",
      submission_id: row.id,
      channel: input.channel,
      template: input.template,
      status,
    },
  }).catch(() => undefined);

  if (status === "failed") {
    throw new Error(sendError ?? "No se pudo enviar.");
  }

  return { message, preview, waLink };
}

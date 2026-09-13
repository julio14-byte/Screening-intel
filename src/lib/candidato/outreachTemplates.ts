import {
  buildPortalPublicUrl,
  candidatoPaths,
} from "@/lib/candidato/paths";

export const OUTREACH_TEMPLATES = [
  "te_llamamos",
  "trae_receta",
  "link_portal",
] as const;

export type OutreachTemplateKey = (typeof OUTREACH_TEMPLATES)[number];

export const OUTREACH_TEMPLATE_LABELS: Record<OutreachTemplateKey, string> = {
  te_llamamos: "Te llamamos",
  trae_receta: "Trae receta",
  link_portal: "Link del portal",
};

export type OutreachChannel = "sms" | "whatsapp" | "whatsapp_link";

export type OutreachStatus = "sent" | "failed" | "opened_link";

export type OutreachRow = {
  id: string;
  channel: OutreachChannel;
  template_key: OutreachTemplateKey;
  to_e164: string;
  status: OutreachStatus;
  error: string | null;
  created_at: string;
};

export function buildOutreachMessage(input: {
  template: OutreachTemplateKey;
  firstName: string;
  siteName: string;
  orgSlug: string;
}): string {
  const first = input.firstName.trim().split(/\s+/)[0] || "hola";
  const site = input.siteName.trim() || "tu centro de investigación";
  const portalUrl = buildPortalPublicUrl(candidatoPaths.site(input.orgSlug));

  switch (input.template) {
    case "te_llamamos":
      return (
        `Hola ${first}, te escribe ${site}. ` +
        `Te llamamos para coordinar el pre-screening. ` +
        `Si no puedes atender, respóndenos por este medio.`
      );
    case "trae_receta":
      return (
        `Hola ${first}, te escribe ${site}. ` +
        `Para tu visita de pre-screening trae receta e informes de laboratorio recientes ` +
        `(PDF o foto nítida).`
      );
    case "link_portal":
      return (
        `Hola ${first}, te escribe ${site}. ` +
        `Completa (o revisa) tu pre-registro aquí: ${portalUrl}`
      );
  }
}

export function whatsappDeepLink(e164: string, text: string): string {
  const digits = e164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

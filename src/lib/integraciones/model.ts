import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const INTEGRATION_KINDS = ["edc", "epro", "iwrs"] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const INTEGRATION_KIND_LABEL: Record<IntegrationKind, string> = {
  edc: "EDC",
  epro: "ePRO",
  iwrs: "IWRS / IRT",
};

export const INTEGRATION_KIND_HINT: Record<IntegrationKind, string> = {
  edc: "Captura clínica del estudio (visitas, CRF). El tercero crea el sujeto cuando el screening pasa a elegible.",
  epro: "Cuestionarios del paciente. El tercero invita al sujeto; Crisvia no hospeda /epro-app.",
  iwrs: "Randomización y kit. El IRT del sponsor es la fuente de verdad; avisa a Crisvia cuando asignó el kit.",
};

export const SCREENING_OUTBOUND_EVENTS = [
  "screening.eligible",
  "screening.screen_failure",
  "screening.randomized",
] as const;
export type ScreeningOutboundEvent = (typeof SCREENING_OUTBOUND_EVENTS)[number];

export const INTEGRATION_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20260925050000_protocol_integrations.sql y recargar el schema.";

export function isIntegrationKind(value: string): value is IntegrationKind {
  return (INTEGRATION_KINDS as readonly string[]).includes(value);
}

/** HTTPS en producción; HTTP solo en localhost. */
export function isAllowedWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export function eventForStatus(
  status: string
): ScreeningOutboundEvent | null {
  if (status === "screening") return "screening.eligible";
  if (status === "screen_failure") return "screening.screen_failure";
  if (status === "randomized") return "screening.randomized";
  return null;
}

/** Qué sistemas deben enterarse de cada evento. */
export function kindsForEvent(event: ScreeningOutboundEvent): IntegrationKind[] {
  if (event === "screening.eligible") return ["edc", "epro", "iwrs"];
  if (event === "screening.screen_failure") return ["edc", "iwrs"];
  return ["edc", "epro"];
}

export function newSigningSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function signPayload(secret: string, rawBody: string): string {
  const hex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `sha256=${hex}`;
}

export function signatureMatches(
  secret: string,
  rawBody: string,
  header: string | null
): boolean {
  if (!header) return false;
  const expected = signPayload(secret, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(header.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function bearerMatches(secret: string, header: string | null): boolean {
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isMissingIntegrationSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentions =
    /protocol_integrations|integration_deliveries|screening_external_ids/i.test(
      message
    );
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(message);
  return mentions && missing;
}

export type IntegrationPublic = {
  id: string;
  protocol_id: string;
  kind: IntegrationKind;
  vendor: string;
  endpoint_url: string;
  active: boolean;
  last_error: string;
  last_delivered_at: string | null;
};

export function stripSecret<T extends { signing_secret?: string }>(
  row: T
): Omit<T, "signing_secret"> {
  const copy = { ...row };
  delete copy.signing_secret;
  return copy;
}

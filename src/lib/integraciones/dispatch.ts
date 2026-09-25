import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseAdminClient,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";
import {
  eventForStatus,
  kindsForEvent,
  signPayload,
  type IntegrationKind,
  type ScreeningOutboundEvent,
} from "./model";

const SELECT_SCREENING =
  "id, status, match_score, patient_id, protocol_id, patients(subject_code), protocols(code_name, title, clinic_id)";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function dispatchScreeningEvent(
  supabase: SupabaseClient,
  organizationId: string,
  screeningId: string,
  status: string
): Promise<{ delivered: number; event: ScreeningOutboundEvent | null }> {
  const event = eventForStatus(status);
  if (!event) return { delivered: 0, event: null };
  if (!isAuditAdminConfigured()) return { delivered: 0, event };

  const { data: screening, error } = await supabase
    .from("screenings")
    .select(SELECT_SCREENING)
    .eq("id", screeningId)
    .maybeSingle();
  if (error || !screening) return { delivered: 0, event };

  const patient = firstRel(
    screening.patients as
      | { subject_code: string | null }
      | { subject_code: string | null }[]
      | null
  );
  const protocol = firstRel(
    screening.protocols as
      | { code_name: string; title: string; clinic_id: string }
      | { code_name: string; title: string; clinic_id: string }[]
      | null
  );
  if (!protocol) return { delivered: 0, event };

  const kinds = kindsForEvent(event);
  const writer = createSupabaseAdminClient();
  const { data: integrations } = await writer
    .from("protocol_integrations")
    .select("id, kind, vendor, endpoint_url, signing_secret, active")
    .eq("organization_id", organizationId)
    .eq("protocol_id", screening.protocol_id)
    .eq("active", true)
    .in("kind", kinds);

  const payload = {
    event,
    occurred_at: new Date().toISOString(),
    protocol: {
      id: screening.protocol_id,
      code: protocol.code_name,
      title: protocol.title,
    },
    screening: {
      id: screening.id,
      status,
      match_score: screening.match_score,
    },
    subject: {
      patient_id: screening.patient_id,
      subject_code: patient?.subject_code ?? null,
    },
  };
  const rawBody = JSON.stringify(payload);
  let delivered = 0;

  for (const row of integrations ?? []) {
    const endpoint = (row.endpoint_url as string).trim();
    if (!endpoint) continue;
    const signature = signPayload(row.signing_secret as string, rawBody);
    let httpStatus: number | null = null;
    let errorText = "";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Crisvia-Signature": signature,
          "X-Crisvia-Event": event,
          "X-Crisvia-Kind": row.kind as IntegrationKind,
        },
        body: rawBody,
        signal: AbortSignal.timeout(8000),
      });
      httpStatus = response.status;
      if (!response.ok) {
        errorText = (await response.text()).slice(0, 500);
      } else {
        delivered += 1;
      }
    } catch (err) {
      errorText = err instanceof Error ? err.message : "Fallo de red.";
    }

    await writer.from("integration_deliveries").insert({
      organization_id: organizationId,
      integration_id: row.id,
      protocol_id: screening.protocol_id,
      screening_id: screeningId,
      event_type: event,
      direction: "outbound",
      payload,
      http_status: httpStatus,
      error: errorText,
    });

    await writer
      .from("protocol_integrations")
      .update({
        last_error: errorText,
        last_delivered_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  return { delivered, event };
}

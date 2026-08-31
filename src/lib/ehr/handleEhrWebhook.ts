import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEhrPatientInput } from "./mapFhirToScreenlane";
import { createEhrSyncLog, finalizeEhrSyncLog } from "./sync-log";
import type { EhrWebhookBody, EhrWebhookEventType } from "./types";
import { upsertPatientFromEhr } from "./upsertPatientFromEhr";
import { refreshMatchScoresForPatient } from "./triggerRematchForPatient";

function profileModeForEvent(
  _eventType: EhrWebhookEventType
): "replace" | "merge" {
  // Webhooks siempre merge incremental (labs/dx nuevos sin pisar el resto).
  return "merge";
}

export async function handleEhrWebhook(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    body: EhrWebhookBody;
    ehrSource?: string | null;
  }
): Promise<{
  duplicate: boolean;
  logId: string;
  patientId?: string;
  rematchRefreshed: number;
}> {
  const { event_id, event_type } = input.body;

  const { data: existingEvent } = await supabase
    .from("ehr_webhook_events")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("event_id", event_id)
    .maybeSingle();

  if (existingEvent?.id) {
    return { duplicate: true, logId: "", rematchRefreshed: 0 };
  }

  const patientPayload =
    normalizeEhrPatientInput(input.body.patient) ??
    normalizeEhrPatientInput(input.body);

  if (!patientPayload) {
    throw new Error("Payload de paciente EHR inválido.");
  }

  const logId = await createEhrSyncLog(supabase, {
    organizationId: input.organizationId,
    syncType: "webhook",
    payloadSummary: {
      event_id,
      event_type,
      ehr_patient_id: patientPayload.ehr_patient_id,
    },
  });

  let status: "completed" | "failed" = "completed";
  let patientsCreated = 0;
  let patientsUpdated = 0;
  let patientsFailed = 0;
  let rematchRefreshed = 0;
  let patientId: string | undefined;
  const errors: string[] = [];

  try {
    const result = await upsertPatientFromEhr(supabase, patientPayload, {
      organizationId: input.organizationId,
      ehrSource: input.ehrSource ?? input.body.ehr_source,
      profileMode: profileModeForEvent(event_type),
    });

    patientId = result.patientId;
    if (result.action === "created") patientsCreated = 1;
    else patientsUpdated = 1;

    if (result.profileUpdated || event_type !== "patient.upsert") {
      const refresh = await refreshMatchScoresForPatient(
        supabase,
        result.patientId,
        input.organizationId
      );
      if (refresh.screeningsUpdated > 0 || refresh.rematchCandidates > 0) {
        rematchRefreshed = 1;
      }
    }

    await supabase.from("ehr_webhook_events").insert({
      organization_id: input.organizationId,
      event_id,
      event_type,
      sync_log_id: logId,
    });
  } catch (err) {
    status = "failed";
    patientsFailed = 1;
    errors.push(err instanceof Error ? err.message : "Error en webhook EHR.");
  }

  await finalizeEhrSyncLog(supabase, logId, {
    status,
    patientsCreated,
    patientsUpdated,
    patientsFailed,
    rematchRefreshed,
    errors,
    payloadSummary: {
      event_id,
      event_type,
      ehr_patient_id: patientPayload.ehr_patient_id,
      patient_id: patientId ?? null,
    },
  });

  if (status === "failed") {
    throw new Error(errors[0] ?? "Webhook EHR falló.");
  }

  return { duplicate: false, logId, patientId, rematchRefreshed };
}

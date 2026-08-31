import type { SupabaseClient } from "@supabase/supabase-js";
import type { EhrSyncStatus, EhrSyncType } from "./types";

export async function createEhrSyncLog(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    syncType: EhrSyncType;
    triggeredBy?: string | null;
    payloadSummary?: Record<string, unknown>;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("ehr_sync_logs")
    .insert({
      organization_id: input.organizationId,
      sync_type: input.syncType,
      status: "running",
      triggered_by: input.triggeredBy ?? null,
      payload_summary: input.payloadSummary ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear ehr_sync_log.");
  }

  return data.id as string;
}

export async function finalizeEhrSyncLog(
  supabase: SupabaseClient,
  logId: string,
  input: {
    status: EhrSyncStatus;
    patientsCreated: number;
    patientsUpdated: number;
    patientsFailed: number;
    rematchRefreshed: number;
    errors?: string[];
    payloadSummary?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from("ehr_sync_logs")
    .update({
      status: input.status,
      patients_created: input.patientsCreated,
      patients_updated: input.patientsUpdated,
      patients_failed: input.patientsFailed,
      rematch_refreshed: input.rematchRefreshed,
      error_details: (input.errors ?? []).slice(0, 50),
      payload_summary: input.payloadSummary ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);

  if (error) {
    throw new Error(error.message);
  }
}

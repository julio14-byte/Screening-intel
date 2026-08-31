import type { SupabaseClient } from "@supabase/supabase-js";
import { createEhrSyncLog, finalizeEhrSyncLog } from "./sync-log";
import type { EhrBatchSyncBody, EhrSyncStats } from "./types";
import { upsertPatientFromEhr } from "./upsertPatientFromEhr";
import { refreshMatchScoresForPatient } from "./triggerRematchForPatient";

export async function runEhrBatchSync(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    body: EhrBatchSyncBody;
    triggeredBy?: string | null;
    patientLimit?: number;
  }
): Promise<{ logId: string; stats: EhrSyncStats }> {
  const patients = input.body.patients ?? [];
  const ehrSource = input.body.ehr_source;

  const logId = await createEhrSyncLog(supabase, {
    organizationId: input.organizationId,
    syncType: "batch",
    triggeredBy: input.triggeredBy,
    payloadSummary: {
      patientCount: patients.length,
      ehr_source: ehrSource ?? null,
    },
  });

  const stats: EhrSyncStats = {
    created: 0,
    updated: 0,
    failed: 0,
    rematchRefreshed: 0,
    errors: [],
  };

  for (const [index, patient] of patients.entries()) {
    try {
      const result = await upsertPatientFromEhr(supabase, patient, {
        organizationId: input.organizationId,
        ehrSource,
        profileMode: "replace",
        patientLimit: input.patientLimit,
      });

      if (result.action === "created") stats.created += 1;
      else stats.updated += 1;

      if (result.profileUpdated) {
        const refresh = await refreshMatchScoresForPatient(
          supabase,
          result.patientId,
          input.organizationId
        );
        if (refresh.screeningsUpdated > 0 || refresh.rematchCandidates > 0) {
          stats.rematchRefreshed += 1;
        }
      }
    } catch (err) {
      stats.failed += 1;
      stats.errors.push(
        `Paciente ${index + 1} (${patient.ehr_patient_id}): ${
          err instanceof Error ? err.message : "error desconocido"
        }`
      );
    }
  }

  const status =
    stats.failed === 0
      ? "completed"
      : stats.created + stats.updated > 0
        ? "partial"
        : "failed";

  await finalizeEhrSyncLog(supabase, logId, {
    status,
    patientsCreated: stats.created,
    patientsUpdated: stats.updated,
    patientsFailed: stats.failed,
    rematchRefreshed: stats.rematchRefreshed,
    errors: stats.errors,
    payloadSummary: {
      patientCount: patients.length,
      ehr_source: ehrSource ?? null,
    },
  });

  return { logId, stats };
}

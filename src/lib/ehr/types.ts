import type { Gender } from "@/lib/types";

/** Payload normalizado de un paciente desde EHR (batch o webhook). */
export interface EhrPatientPayload {
  ehr_patient_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  conditions?: string[];
  medications?: string[];
  laboratories?: Record<string, number>;
}

export type EhrSyncType = "batch" | "webhook";

export type EhrSyncStatus = "running" | "completed" | "partial" | "failed";

export type EhrWebhookEventType =
  | "patient.upsert"
  | "profile.update"
  | "observation.created";

/** Cuerpo del webhook EHR (Fase 2). */
export interface EhrWebhookBody {
  event_id: string;
  event_type: EhrWebhookEventType;
  organization_id?: string;
  ehr_source?: string;
  patient: EhrPatientPayload | Record<string, unknown>;
}

/** Batch sync (Fase 1). */
export interface EhrBatchSyncBody {
  ehr_source?: string;
  patients: EhrPatientPayload[];
}

export interface EhrUpsertResult {
  patientId: string;
  action: "created" | "updated";
  profileUpdated: boolean;
}

export interface EhrSyncStats {
  created: number;
  updated: number;
  failed: number;
  rematchRefreshed: number;
  errors: string[];
}

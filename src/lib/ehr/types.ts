import type { Gender } from "@/lib/types";

/** Payload normalizado de un paciente para ingreso EHR. */
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

/** Ingreso por lote desde la app (sin webhooks). */
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

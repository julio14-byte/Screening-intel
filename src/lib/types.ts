// Tipos de dominio alineados con el esquema de Supabase (supabase/migrations).

import type { ClinicalAnamnesis } from "@/lib/profile/anamnesis";

export type Gender = "male" | "female" | "other";

export type ProtocolStatus = "active" | "closed";

export type ScreeningStatus =
  | "pre_screening"
  | "screening"
  | "randomized"
  | "screen_failure";

export interface Patient {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  birth_date: string; // ISO date (YYYY-MM-DD)
  gender: Gender;
  /** Código numérico del sujeto en el estudio. Disocia PHI nominativo. */
  subject_code?: string | null;
  /** Etnia registrada por el coordinador (farmacología / criterios). */
  ethnicity?: string | null;
  active?: boolean;
  phone?: string | null;
  email?: string | null;
  address_line?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string;
  resource_version?: number;
  created_at: string;
  updated_at?: string;
}

export interface ClinicalProfile {
  id: string;
  patient_id: string;
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
  anamnesis?: ClinicalAnamnesis;
  reconciled_at?: string | null;
  source_encounter_id?: string | null;
  updated_at: string;
}

export interface LabCriterion {
  name: string;
  min?: number | null;
  max?: number | null;
  unit?: string;
}

export interface InclusionCriteria {
  min_age?: number | null;
  max_age?: number | null;
  gender?: "any" | "male" | "female";
  required_conditions?: string[];
  required_labs?: LabCriterion[];
}

export interface ExclusionCriteria {
  excluded_conditions?: string[];
  excluded_medications?: string[];
}

export interface Protocol {
  id: string;
  clinic_id: string;
  title: string;
  code_name: string;
  inclusion_criteria: InclusionCriteria;
  exclusion_criteria: ExclusionCriteria;
  status: ProtocolStatus;
  created_at: string;
}

export interface Screening {
  id: string;
  patient_id: string;
  protocol_id: string;
  status: ScreeningStatus;
  match_score: number;
  match_details: CriterionResult[];
  /** Motivo clínico u operativo del screen failure. Vacío en filas anteriores a la migración. */
  failure_reason?: string | null;
  failure_recorded_at?: string | null;
  /** Día en que se entregó el medicamento, si el estado es randomizado. */
  medication_delivered_on?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Resultados del motor de matching
// ---------------------------------------------------------------------------

/** Semáforo global de un paciente frente a un protocolo. */
export type MatchVerdict = "eligible" | "pending" | "excluded";

export type CriterionStatus = "pass" | "fail" | "missing";

export interface CriterionResult {
  type: "inclusion" | "exclusion";
  criterion: string;
  status: CriterionStatus;
  /** Frase del motor. No sustituye a la evidencia citada. */
  detail: string;
  /** Texto tal como está en el expediente (condición, medicación, laboratorio o fecha). */
  evidence?: string[];
}

export interface MatchResult {
  patient: Patient;
  profile: ClinicalProfile | null;
  verdict: MatchVerdict;
  score: number; // 0-100
  details: CriterionResult[];
}

// Filas con relaciones embebidas devueltas por Supabase
export interface PatientWithProfile extends Patient {
  /** PostgREST: array o objeto si hay unique(patient_id). */
  clinical_profiles: ClinicalProfile | ClinicalProfile[] | null;
}

export interface ScreeningWithRelations extends Screening {
  patients: Patient;
  protocols: Pick<Protocol, "id" | "title" | "code_name" | "status">;
}


// Tipos de dominio alineados con el esquema de Supabase (supabase/migrations).

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
  created_at: string;
}

export interface ClinicalProfile {
  id: string;
  patient_id: string;
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
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
  detail: string;
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
  clinical_profiles: ClinicalProfile[] | null;
}

export interface ScreeningWithRelations extends Screening {
  patients: Patient;
  protocols: Pick<Protocol, "id" | "title" | "code_name" | "status">;
}

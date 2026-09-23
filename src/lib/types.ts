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
  reconciled_at?: string | null;
  source_encounter_id?: string | null;
  updated_at: string;
}

/** FHIR Condition — diagnóstico del Patient. */
export interface FhirCondition {
  id: string;
  organization_id: string;
  patient_id: string;
  encounter_id?: string | null;
  clinical_status: string;
  verification_status: string;
  code_text: string;
  code_system?: string | null;
  code_value?: string | null;
  onset_date?: string | null;
  recorded_at: string;
  source: "manual" | "ingest" | "epro";
}

/** FHIR Observation — laboratorio o signo vital. */
export interface FhirObservation {
  id: string;
  organization_id: string;
  patient_id: string;
  encounter_id?: string | null;
  status: string;
  category: string;
  code_text: string;
  value_quantity?: number | null;
  value_unit?: string | null;
  effective_at: string;
}

/** FHIR Encounter — consulta ligada al Patient. */
export interface FhirEncounter {
  id: string;
  organization_id: string;
  patient_id: string;
  status: string;
  class_code: string;
  period_start: string;
  period_end?: string | null;
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

// ---------------------------------------------------------------------------
// ePRO — Fase A
// ---------------------------------------------------------------------------

export type EproQuestionType = "scale" | "yesno" | "text";

export interface EproQuestion {
  id: string;
  type: EproQuestionType;
  label: string;
  min?: number;
  max?: number;
}

export interface EproForm {
  id: string;
  title: string;
  description: string | null;
  protocol_id: string | null;
  questions: EproQuestion[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EproResponse {
  id: string;
  form_id: string;
  patient_id: string;
  answers: Record<string, string | number | boolean>;
  submitted_at: string;
}

export interface EproResponseWithPatient extends EproResponse {
  patients: Pick<Patient, "id" | "first_name" | "last_name">;
}

// ---------------------------------------------------------------------------
// Farmacia del protocolo — lotes e inventario
// ---------------------------------------------------------------------------

export type PrescriptionStatus = "draft" | "delivered" | "cancelled";

export type InventoryMovementKind = "receive" | "dispense" | "adjust";

export interface ProtocolStudyMedication {
  id: string;
  organization_id: string;
  protocol_id: string;
  name: string;
  strength: string;
  form: string;
  unit: string;
  created_at: string;
}

export interface MedicationLot {
  id: string;
  organization_id: string;
  protocol_id: string;
  study_medication_id: string;
  lot_number: string;
  expires_on: string | null;
  quantity_received: number;
  quantity_on_hand: number;
  received_at: string;
  notes: string;
  created_at: string;
}

export interface StudyPrescription {
  id: string;
  organization_id: string;
  protocol_id: string;
  patient_id: string;
  study_medication_id: string;
  lot_id: string;
  quantity: number;
  directions: string;
  status: PrescriptionStatus;
  prescribed_by: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  lot_id: string;
  prescription_id: string | null;
  kind: InventoryMovementKind;
  quantity_delta: number;
  quantity_after: number;
  note: string;
  created_by: string | null;
  created_at: string;
}

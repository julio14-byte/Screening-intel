/** Columnas mínimas para listados — evita `select *` y JSONB innecesario (Disk IO). */

export const PATIENT_LIST_COLUMNS =
  "id, clinic_id, first_name, last_name, birth_date, gender, created_at";

export const PATIENT_WITH_PROFILE_COLUMNS = `${PATIENT_LIST_COLUMNS}, clinical_profiles(id, patient_id, conditions, medications, laboratories, updated_at)`;

export const PROTOCOL_LIST_COLUMNS =
  "id, clinic_id, title, code_name, inclusion_criteria, exclusion_criteria, status, created_at";

const SCREENING_JOINS =
  "patients(id, first_name, last_name, birth_date, gender), protocols(id, title, code_name, status)";

/** Tracker / kanban: sin match_details (JSONB pesado). */
export const SCREENING_LIST_COLUMNS = `id, patient_id, protocol_id, status, match_score, created_at, updated_at, ${SCREENING_JOINS}`;

/** Dashboard: necesita match_details para el semáforo. */
export const SCREENING_LIST_WITH_DETAILS = `id, patient_id, protocol_id, status, match_score, match_details, created_at, updated_at, ${SCREENING_JOINS}`;

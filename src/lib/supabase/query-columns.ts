/** Columnas mínimas para listados — evita `select *` y JSONB innecesario (Disk IO). */

export const PATIENT_CORE_COLUMNS =
  "id, clinic_id, first_name, last_name, birth_date, gender, created_at";

export const PATIENT_LIST_COLUMNS =
  `${PATIENT_CORE_COLUMNS}, subject_code, ethnicity, phone, email, address_line, address_city, address_state, address_postal_code, address_country`;

export const PATIENT_WITH_PROFILE_COLUMNS = `${PATIENT_LIST_COLUMNS}, clinical_profiles(id, patient_id, conditions, medications, laboratories, updated_at)`;
export const PATIENT_WITH_PROFILE_COLUMNS_LEGACY = `${PATIENT_CORE_COLUMNS}, clinical_profiles(id, patient_id, conditions, medications, laboratories, updated_at)`;

export const PROTOCOL_LIST_COLUMNS =
  "id, clinic_id, title, code_name, inclusion_criteria, exclusion_criteria, status, created_at";

const SCREENING_JOINS =
  "patients(id, first_name, last_name, birth_date, gender, subject_code, ethnicity), protocols(id, title, code_name, status)";

const SCREENING_JOINS_LEGACY =
  "patients(id, first_name, last_name, birth_date, gender), protocols(id, title, code_name, status)";

/** Tracker / kanban: sin match_details (JSONB pesado). */
export const SCREENING_LIST_COLUMNS = `id, patient_id, protocol_id, status, match_score, created_at, updated_at, ${SCREENING_JOINS}`;
export const SCREENING_LIST_COLUMNS_LEGACY = `id, patient_id, protocol_id, status, match_score, created_at, updated_at, ${SCREENING_JOINS_LEGACY}`;

/** Dashboard: necesita match_details para el semáforo. */
export const SCREENING_LIST_WITH_DETAILS = `id, patient_id, protocol_id, status, match_score, match_details, created_at, updated_at, ${SCREENING_JOINS}`;
export const SCREENING_LIST_WITH_DETAILS_LEGACY = `id, patient_id, protocol_id, status, match_score, match_details, created_at, updated_at, ${SCREENING_JOINS_LEGACY}`;

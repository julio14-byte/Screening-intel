import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(
  resolve("supabase/migrations/20260923230029_ehr_patient_fhir.sql"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("gen_random_uuid()"), "PKs UUID v4 con gen_random_uuid");
assert(sql.includes("primary key default gen_random_uuid()"), "PK no incremental");
assert(!/id\s+serial/i.test(sql) && !/id\s+bigserial/i.test(sql), "sin serial");
assert(sql.includes("comment on table public.patients"), "comentario FHIR Patient");
assert(sql.includes("comment on table public.conditions"), "comentario FHIR Condition");
assert(sql.includes("comment on table public.encounters"), "comentario FHIR Encounter");
assert(sql.includes("comment on table public.observations"), "comentario FHIR Observation");
assert(sql.includes("comment on table public.consents"), "comentario FHIR Consent");
assert(sql.includes("conditions_patient_recorded_idx"), "índice diagnósticos por fecha");
assert(sql.includes("encounters_patient_start_idx"), "índice consultas por PatientID");
assert(sql.includes("observations_patient_effective_idx"), "índice labs por paciente/fecha");
assert(sql.includes("enable row level security"), "RLS en tablas nuevas");
assert(sql.includes("revoke all on table public.%I from anon"), "sin GRANT anon");
assert(sql.includes("not null"), "constraints NOT NULL");
assert(sql.includes("clinical_documents"), "nota clínica NOM-024");
assert(sql.includes("patient_identifiers"), "Identifier[] separado del listado");
assert(sql.includes("audit.capture_row_change"), "bitácora HIPAA/NOM");

if (failed) process.exit(1);
console.log("verify-ehr-fhir-schema: UUID, FHIR, índices, RLS y bitácora OK");

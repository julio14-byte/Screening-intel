import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

const sql = readFileSync(
  resolve("supabase/migrations/20261021040000_explainable_rematch_consent.sql"),
  "utf8"
);
const rematch = readFileSync(resolve("src/app/(app)/rematch/page.tsx"), "utf8");
const kanban = readFileSync(
  resolve("src/components/tracker/KanbanBoard.tsx"),
  "utf8"
);

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const patient: Patient = {
  id: "p",
  clinic_id: "c",
  first_name: "Ana",
  last_name: "Ruiz",
  birth_date: "1980-05-02",
  gender: "female",
  created_at: "2026-01-01",
};
const profile: ClinicalProfile = {
  id: "cp",
  patient_id: "p",
  conditions: ["Type 2 Diabetes Mellitus"],
  medications: ["metformin"],
  laboratories: { HbA1c: 8.2 },
  updated_at: "2026-01-01",
};
const protocol: Protocol = {
  id: "pr",
  clinic_id: "c",
  title: "Estudio",
  code_name: "DM-1",
  status: "active",
  created_at: "2026-01-01",
  inclusion_criteria: {
    min_age: 18,
    max_age: 75,
    required_conditions: ["diabetes tipo 2"],
    required_labs: [{ name: "HbA1c", max: 10, unit: "%" }],
  },
  exclusion_criteria: {
    excluded_conditions: ["asma"],
    excluded_medications: ["metformina"],
  },
};

const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
const byName = (fragment: string) =>
  result.details.find((detail) => detail.criterion.includes(fragment));

const diagnosis = byName("diabetes tipo 2");
assert(diagnosis?.status === "pass", "el diagnóstico compatible pasa");
assert(
  diagnosis?.evidence?.some((item) => item.includes("Type 2 Diabetes Mellitus")),
  "cita la condición del expediente"
);

const lab = byName("HbA1c");
assert(lab?.status === "pass", "el laboratorio en rango pasa");
assert(
  lab?.evidence?.some((item) => item.includes("8.2")),
  "cita el valor de laboratorio"
);

const age = byName("Edad");
assert(age?.evidence?.some((item) => item.includes("1980-05-02")), "cita la fecha de nacimiento");

const med = byName("metformina");
assert(med?.status === "fail", "la medicación excluyente no se cumple");
assert(
  med?.evidence?.some((item) => item.toLowerCase().includes("metformin")),
  "cita el medicamento del expediente"
);

const asthma = byName("asma");
assert(asthma?.status === "pass", "la exclusión ausente no dispara");
assert(
  (asthma?.evidence ?? []).length === 0,
  "sin término compatible no inventa evidencia"
);
assert(
  asthma?.detail.includes("no prueba"),
  "avisa que la ausencia en el perfil no es prueba"
);

const bare = evaluatePatientAgainstProtocol(
  patient,
  null,
  protocol
);
assert(
  bare.details.some((detail) => detail.status === "missing"),
  "sin perfil, el criterio requiere información"
);

assert(sql.includes("failure_reason"), "columna de motivo");
assert(sql.includes("patient_reuse_consents"), "tabla de consentimiento");
assert(sql.includes("can_write_clinical_data()"), "solo quien escribe autoriza");
assert(sql.includes("get_user_organization_ids()"), "acceso por organización");
assert(sql.includes("authorized_by := auth.uid()"), "el actor sale de la sesión");
assert(sql.includes("enable row level security"), "RLS");
assert(!/grant delete/i.test(sql), "sin DELETE");
assert(rematch.includes("CriterionEvidenceList"), "re-match muestra la evidencia");
assert(rematch.includes("Registrar autorización"), "re-match pide autorización");
assert(kanban.includes("Motivo del screen failure"), "el tracker pide el motivo");

if (failed) process.exit(1);
console.log("verify-explainable-rematch: evidencia por criterio, motivo y consentimiento OK");

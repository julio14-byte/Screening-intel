import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import {
  clinicalTermsMatch,
  findLabValue,
} from "../src/lib/matching/clinicalTerms";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(clinicalTermsMatch("hypertension", "hipertensión", "condition"), "HTN");
assert(
  clinicalTermsMatch("type 2 diabetes mellitus", "diabetes tipo 2", "condition"),
  "T2DM"
);
assert(
  !clinicalTermsMatch("type 1 diabetes", "diabetes tipo 2", "condition"),
  "T1 vs T2"
);
assert(
  clinicalTermsMatch("diabetes", "diabetes tipo 2", "condition"),
  "generic diabetes"
);
assert(clinicalTermsMatch("COPD", "EPOC", "condition"), "COPD");
assert(
  clinicalTermsMatch(
    "chronic kidney disease",
    "insuficiencia renal",
    "condition"
  ),
  "CKD"
);
assert(clinicalTermsMatch("insulin", "insulina", "medication"), "insulin");
assert(
  clinicalTermsMatch("HbA1c", "hemoglobina glicosilada", "lab"),
  "A1c"
);
assert(clinicalTermsMatch("glucose", "glucosa", "lab"), "glucose");
assert(findLabValue({ glucosa: 140 }, "fasting glucose") === 140, "lab lookup");

const now = "2020-01-01T00:00:00.000Z";
const patient: Patient = {
  id: "p1",
  clinic_id: "c1",
  first_name: "Ana",
  last_name: "Lopez",
  birth_date: "1970-01-01",
  gender: "female",
  created_at: now,
};
const profile: ClinicalProfile = {
  id: "cp1",
  patient_id: "p1",
  conditions: ["diabetes tipo 2", "hipertensión"],
  medications: ["metformina"],
  laboratories: { glucosa: 150, hba1c: 8, creatinina: 1 },
  updated_at: now,
};
const protocol: Protocol = {
  id: "pr1",
  clinic_id: "c1",
  title: "T2DM US sponsor",
  code_name: "T2DM-US-1",
  status: "active",
  created_at: now,
  inclusion_criteria: {
    min_age: 18,
    max_age: 80,
    gender: "any",
    required_conditions: ["Type 2 diabetes mellitus", "hypertension"],
    required_labs: [
      { name: "HbA1c", min: 7, max: 10, unit: "%" },
      { name: "glucose", min: 100, max: 250, unit: "mg/dL" },
    ],
  },
  exclusion_criteria: {
    excluded_conditions: ["chronic kidney disease"],
    excluded_medications: ["insulin"],
  },
};

const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
assert(
  result.verdict === "eligible",
  `expected eligible, got ${result.verdict} ${JSON.stringify(result.details)}`
);

const excluded = evaluatePatientAgainstProtocol(
  patient,
  { ...profile, conditions: [...profile.conditions, "insuficiencia renal"] },
  protocol
);
assert(
  excluded.verdict === "excluded",
  `expected excluded, got ${excluded.verdict}`
);

const t1 = evaluatePatientAgainstProtocol(
  patient,
  { ...profile, conditions: ["diabetes tipo 1", "hipertensión"] },
  protocol
);
assert(
  t1.verdict === "excluded",
  `T1 should fail T2 inclusion, got ${t1.verdict}`
);

console.log("ok", result.verdict, result.score);

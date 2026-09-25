import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import { clinicalTermMatches } from "../src/lib/matching/aliases";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(
  clinicalTermMatches(["Type 2 Diabetes Mellitus"], "diabetes tipo 2"),
  "MH en inglés vs criterio en español"
);
assert(
  !clinicalTermMatches(["diabetes tipo 1"], "diabetes tipo 2"),
  "tipo 1 no es tipo 2"
);
assert(clinicalTermMatches(["metformin"], "metformina"), "CMTRT metformin");
assert(clinicalTermMatches(["COPD"], "epoc"), "COPD → EPOC");

const patient: Patient = {
  id: "p1",
  clinic_id: "org",
  first_name: "Sujeto",
  last_name: "10001",
  birth_date: "1962-04-12",
  gender: "female",
  created_at: "2026-01-01T00:00:00Z",
};

const profile: ClinicalProfile = {
  id: "c1",
  patient_id: "p1",
  conditions: ["Type 2 Diabetes Mellitus"],
  medications: ["metformin"],
  laboratories: { glucosa: 145, hba1c: 7.8 },
  updated_at: "2026-01-01T00:00:00Z",
};

const protocol: Protocol = {
  id: "pr1",
  clinic_id: "org",
  title: "GLP1",
  code_name: "GLP1-01",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  inclusion_criteria: {
    min_age: 18,
    max_age: 75,
    gender: "any",
    required_conditions: ["diabetes tipo 2"],
    required_labs: [
      { name: "hba1c", min: 7, max: 10.5, unit: "%" },
      { name: "glucose", min: 110, max: 250, unit: "mg/dL" },
    ],
  },
  exclusion_criteria: {
    excluded_conditions: ["insuficiencia renal"],
    excluded_medications: ["insulina"],
  },
};

const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
assert(result.verdict === "eligible", `elegible, fue ${result.verdict}`);
assert(result.score === 100, `score 100, fue ${result.score}`);

const diaryOnly: ClinicalProfile = {
  ...profile,
  conditions: [],
  medications: [],
  laboratories: { qsscore: 12 },
};
const diary = evaluatePatientAgainstProtocol(patient, diaryOnly, protocol);
assert(diary.verdict !== "eligible", "un score ePRO no hace elegible");

if (failed) process.exit(1);
console.log("verify-matching-aliases: CSV EDC en inglés cruza el protocolo en español");

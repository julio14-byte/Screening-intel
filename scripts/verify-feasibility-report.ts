import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import {
  buildFeasibilityReport,
  feasibilityPercent,
} from "../src/lib/matching/feasibility";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

const component = readFileSync(
  resolve("src/components/protocols/FeasibilityReport.tsx"),
  "utf8"
);
const page = readFileSync(
  resolve("src/app/(app)/protocols/[id]/match/page.tsx"),
  "utf8"
);

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function patient(id: string, name: string, birth: string): Patient {
  return {
    id,
    clinic_id: "c",
    first_name: name,
    last_name: "Secreto",
    birth_date: birth,
    gender: "female",
    created_at: "2026-01-01",
  };
}

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
    required_labs: [{ name: "HbA1c", max: 7, unit: "%" }],
  },
  exclusion_criteria: { excluded_conditions: ["asma"], excluded_medications: [] },
};

const withChart: ClinicalProfile = {
  id: "cp",
  patient_id: "p1",
  conditions: ["Type 2 Diabetes Mellitus"],
  medications: [],
  laboratories: { HbA1c: 8.4 },
  updated_at: "2026-01-01",
};
const results = [
  evaluatePatientAgainstProtocol(
    patient("p1", "Ana", "1980-05-02"),
    withChart,
    protocol
  ),
  evaluatePatientAgainstProtocol(
    patient("p2", "Luis", "1975-01-01"),
    null,
    protocol
  ),
];
const report = buildFeasibilityReport(results);
const serialized = JSON.stringify(report);

assert(report.evaluated === 2, "evalúa a los dos");
assert(report.excluded === 1, "el de HbA1c alta no cumple");
assert(report.pending === 1, "sin datos queda pendiente");
assert(report.eligible === 0, "ninguno cumple todo");
assert(feasibilityPercent(1, 2) === 50, "porcentaje");
assert(
  report.topExcluding?.criterion.includes("HbA1c") === true,
  "el laboratorio es lo que más deja afuera"
);
assert(
  (report.topMissing?.missing ?? 0) > 0,
  "hay un criterio que pide información"
);
assert(!serialized.includes("Ana"), "el informe no lleva el nombre");
assert(!serialized.includes("Secreto"), "el informe no lleva el apellido");
assert(!serialized.includes("8.4"), "el informe no lleva el valor de laboratorio");
assert(!serialized.includes("1980-05-02"), "el informe no lleva la fecha de nacimiento");
assert(!serialized.includes("Type 2 Diabetes"), "el informe no cita el expediente");
assert(!component.includes("first_name"), "la hoja no renderiza nombres");
assert(!component.includes(".evidence"), "la hoja no renderiza evidencia clínica");
assert(!component.includes(".detail"), "la hoja no renderiza el detalle del paciente");
assert(page.includes("FeasibilityReport"), "el matching muestra el informe");
assert(page.includes("print:hidden"), "al imprimir se oculta la lista de pacientes");

if (failed) process.exit(1);
console.log("verify-feasibility-report: conteos sin nombres ni expediente OK");

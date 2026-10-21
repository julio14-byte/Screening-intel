import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import {
  applyCohort,
  buildFeasibilityReport,
  feasibilityPercent,
  monthsBefore,
  sponsorFeasibilityLetter,
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

const today = new Date(2026, 9, 21);
assert(monthsBefore("2026-03-31", 1) === "2026-02-28", "la ventana recorta el día al mes destino");
const rows = [
  { id: "reciente", registeredOn: "2026-10-01", chartUpdatedOn: "2026-09-15" },
  { id: "viejo", registeredOn: "2024-01-01", chartUpdatedOn: "2024-06-01" },
  { id: "sin", registeredOn: "2026-10-01", chartUpdatedOn: null },
];
const windowed = applyCohort(rows, { kind: "chart_window", months: 12 }, today);
assert(windowed.kept.map((row) => row.id).join() === "reciente", "la ventana de 12 meses se queda con el expediente reciente");
assert(windowed.leftOut === 2, "sin expediente o con expediente viejo quedan fuera");
assert(windowed.from === "2025-10-21" && windowed.to === "2026-10-21", "la ventana corre hacia atrás desde hoy");
const full = applyCohort(rows, { kind: "registry" }, today);
assert(full.kept.length === 3 && full.leftOut === 0, "el registro completo no descarta pacientes");

const letter = sponsorFeasibilityLetter({
  siteName: "Centro Norte",
  protocolCode: protocol.code_name,
  protocolTitle: protocol.title,
  preparedOn: "2026-10-21",
  cohortLabel: full.label,
  report,
});
assert(letter.includes("antes de aceptar el estudio"), "la hoja dice para qué sirve");
assert(letter.includes("21 de octubre de 2026"), "la hoja lleva la fecha");
assert(letter.includes("Centro Norte"), "la hoja nombra al centro, no al paciente");
assert(letter.includes("No incluyen nombres"), "la hoja declara que no van identificadores");
assert(!letter.includes("Ana") && !letter.includes("Secreto"), "la hoja no arrastra nombres");
assert(!letter.includes("8.4") && !letter.includes("1980-05-02"), "la hoja no arrastra expediente");
assert(component.includes("Copiar texto para el patrocinador"), "se puede copiar la hoja");
assert(component.includes("Expediente actualizado en los últimos"), "se elige la ventana de la cohorte");

if (failed) process.exit(1);
console.log("verify-feasibility-report: conteos sin nombres ni expediente OK");

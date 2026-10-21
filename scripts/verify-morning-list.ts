import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildMorningList } from "../src/lib/matching/morning-list";
import { addDays, startOfDay, type VisitRow } from "../src/lib/ops/visits";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

const component = readFileSync(resolve("src/components/citas/MorningList.tsx"), "utf8");
const board = readFileSync(resolve("src/components/citas/CitasBoard.tsx"), "utf8");

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

function protocol(
  id: string,
  code: string,
  status: Protocol["status"],
  inclusion: Protocol["inclusion_criteria"],
  exclusion: Protocol["exclusion_criteria"] = { excluded_conditions: [], excluded_medications: [] }
): Protocol {
  return {
    id,
    clinic_id: "c",
    title: code,
    code_name: code,
    status,
    created_at: "2026-01-01",
    inclusion_criteria: inclusion,
    exclusion_criteria: exclusion,
  };
}

function visit(
  id: string,
  patientId: string,
  at: Date,
  status: VisitRow["status"],
  name = "Ana"
): VisitRow {
  return {
    id,
    patient_id: patientId,
    protocol_id: null,
    scheduled_at: at.toISOString(),
    location: "Sede",
    status,
    notes: "",
    kind: "consulta",
    clinician_name: "",
    patient: {
      first_name: name,
      last_name: "Secreto",
      subject_code: null,
      phone: null,
      email: null,
    },
    protocol_code: null,
  };
}

const now = new Date(2026, 9, 21, 15, 0, 0);
const tomorrow = addDays(startOfDay(now), 1);
tomorrow.setHours(9, 30, 0, 0);
const tomorrowLuz = new Date(tomorrow);
tomorrowLuz.setHours(10, 0, 0, 0);
const tomorrowMissing = new Date(tomorrow);
tomorrowMissing.setHours(10, 30, 0, 0);
const tomorrowLater = new Date(tomorrow);
tomorrowLater.setHours(11, 0, 0, 0);
const today = new Date(now);
today.setHours(11, 0, 0, 0);
const dayAfter = addDays(startOfDay(now), 2);
dayAfter.setHours(9, 0, 0, 0);

const diabetes = protocol("dm", "DM-1", "active", {
  min_age: 18,
  max_age: 75,
  required_conditions: ["diabetes tipo 2"],
  required_labs: [{ name: "HbA1c", max: 7, unit: "%" }],
});
const hypertension = protocol("hta", "HTA-2", "active", {
  min_age: 18,
  max_age: 80,
  required_conditions: ["hipertensión"],
});
const closedMatch = protocol("closed", "AAA-CERRADO", "closed", {
  min_age: 18,
  max_age: 80,
});
const ageOnlyA = protocol("a", "A-EDAD", "active", { min_age: 18, max_age: 80 });
const ageOnlyB = protocol("b", "B-EDAD", "active", { min_age: 18, max_age: 80 });

const chart: ClinicalProfile = {
  id: "cp",
  patient_id: "ana",
  conditions: ["Type 2 Diabetes Mellitus", "Hypertension"],
  medications: [],
  laboratories: { HbA1c: 8.4 },
  updated_at: "2026-01-01",
};
const pendingChart: ClinicalProfile = {
  id: "cp2",
  patient_id: "luz",
  conditions: ["Type 2 Diabetes Mellitus"],
  medications: [],
  laboratories: {},
  updated_at: "2026-01-01",
};

const ana = patient("ana", "Ana", "1980-05-02");
const luz = patient("luz", "Luz", "1975-03-03");
const pairs = [
  { patient: ana, profile: chart },
  { patient: luz, profile: pendingChart },
  { patient: patient("sin-perfil", "Nuria", "1990-01-01"), profile: null },
];

const items = buildMorningList({
  visits: [
    visit("hoy", "ana", today, "scheduled"),
    visit("manana-tarde", "ana", tomorrowLater, "scheduled"),
    visit("cancelada", "ana", tomorrow, "cancelled"),
    visit("pasado", "ana", dayAfter, "scheduled"),
    visit("manana", "ana", tomorrow, "scheduled"),
    visit("luz", "luz", tomorrowLuz, "scheduled", "Luz"),
    visit("sin-par", "otro", tomorrowMissing, "scheduled", "Otto"),
    visit("hecha", "ana", tomorrow, "completed"),
  ],
  pairs,
  protocols: [diabetes, hypertension, closedMatch],
  now,
});

const serialized = JSON.stringify(items);
const anaRow = items.find((item) => item.visitId === "manana");
const luzRow = items.find((item) => item.visitId === "luz");
const missingRow = items.find((item) => item.visitId === "sin-par");

assert(items.map((item) => item.visitId).join(",") === "manana,luz,sin-par,manana-tarde", "solo citas programadas de mañana, por hora");
assert(anaRow?.gap === "eligible" && anaRow.protocolCode === "HTA-2", "elige el protocolo que sí calza");
assert(anaRow?.criterion === null, "si cumple, no arrastra un criterio");
assert(luzRow?.gap === "pending", "sin laboratorio queda pendiente");
assert(
  luzRow?.criterion === "Lab HbA1c ≤ 7 %",
  "el criterio que falta es el nombre del protocolo"
);
assert(luzRow?.protocolCode === "DM-1", "el pendiente apunta al protocolo que lo pide");
assert(missingRow?.gap === "no_chart" && missingRow.protocolId === null, "sin ficha no inventa protocolo");
assert(!serialized.includes("8.4"), "la lista no copia el valor de laboratorio");
assert(!serialized.includes("Type 2 Diabetes"), "la lista no cita el expediente");
assert(!serialized.includes("1980-05-02"), "la lista no copia la fecha de nacimiento");
assert(!serialized.includes("AAA-CERRADO"), "un protocolo cerrado no entra");

const excludedOnly = buildMorningList({
  visits: [visit("solo-dm", "ana", tomorrow, "scheduled")],
  pairs,
  protocols: [diabetes, closedMatch],
  now,
});
assert(
  excludedOnly[0]?.gap === "excluded" &&
    excludedOnly[0].protocolCode === "DM-1" &&
    excludedOnly[0].criterion?.includes("HbA1c") === true,
  "si ninguno calza, muestra el criterio que no se cumple"
);
assert(!JSON.stringify(excludedOnly).includes("8.4"), "el criterio que falla no lleva el valor");

const tie = buildMorningList({
  visits: [visit("empate", "ana", tomorrow, "scheduled")],
  pairs,
  protocols: [ageOnlyB, ageOnlyA],
  now,
});
assert(tie[0]?.gap === "eligible" && tie[0].protocolCode === "A-EDAD", "a igualdad de puntaje gana el código");

const noProtocols = buildMorningList({
  visits: [visit("vacio", "ana", tomorrow, "scheduled")],
  pairs,
  protocols: [closedMatch],
  now,
});
assert(noProtocols[0]?.gap === "no_protocols", "sin protocolos activos no compara");

const withoutChart = buildMorningList({
  visits: [visit("nuria", "sin-perfil", tomorrow, "scheduled", "Nuria")],
  pairs,
  protocols: [diabetes, hypertension],
  now,
});
assert(
  withoutChart[0]?.gap === "pending" &&
    withoutChart[0].criterion === "Diagnóstico requerido: hipertensión",
  "una ficha vacía señala el criterio que falta, no el expediente"
);
assert(!JSON.stringify(withoutChart).includes("1990-01-01"), "la ficha vacía no copia la fecha de nacimiento");

assert(component.includes("Lista de la mañana"), "la sección tiene título");
assert(component.includes("Ningún protocolo activo parece calzar"), "dice cuando ninguno calza");
assert(component.includes("Sin ficha clínica"), "dice cuando no hay ficha");
assert(component.includes("todavía falta"), "nombra el criterio pendiente");
assert(!component.includes(".evidence"), "la lista no renderiza evidencia clínica");
assert(!component.includes(".detail"), "la lista no renderiza el detalle del paciente");
assert(!component.includes("laboratories"), "la lista no lee laboratorios");
assert(board.includes("MorningList"), "Citas muestra la lista");
assert(board.includes("buildMorningList"), "Citas arma la lista con la función");

if (failed) process.exit(1);
console.log("verify-morning-list: citas de mañana, mejor protocolo y criterio faltante OK");

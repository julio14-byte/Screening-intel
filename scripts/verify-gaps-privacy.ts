import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { redactIdentifiers } from "../src/lib/privacy/redact";
import { buildPatientGaps } from "../src/lib/matching/missing-data";
import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// --- Enmascarado ---------------------------------------------------------
const note = [
  "Paciente: María Fernanda López Ruiz, fecha de nacimiento: 12/03/1971.",
  "Tel. 55 1234 5678, correo maria.lopez@correo.mx. CURP LORM710312MDFPZR09, RFC LORM710312AB1.",
  "Expediente 88231-A. Vive en Calle Durango 45, Col. Roma Norte, C.P. 06700.",
  "Atendida por la Dra. Elena Ortiz. Diabetes tipo 2 desde 2015. HbA1c 8.4 %, glucosa 182 mg/dl, TA 130/85.",
  "Toma metformina 850 mg cada 12 h. Refiere que Fernanda no ha tenido hospitalizaciones.",
].join("\n");
const red = redactIdentifiers(note, { names: ["María Fernanda", "López Ruiz"] });

for (const leaked of [
  "María",
  "López",
  "Ruiz",
  "Fernanda",
  "maria.lopez@correo.mx",
  "55 1234 5678",
  "LORM710312MDFPZR09",
  "LORM710312AB1",
  "88231-A",
  "Durango",
  "06700",
  "12/03/1971",
  "Elena Ortiz",
]) {
  assert(!red.text.includes(leaked), `se enmascara: ${leaked}`);
}
for (const kept of ["Diabetes tipo 2", "desde 2015", "HbA1c 8.4", "182 mg/dl", "130/85", "metformina 850 mg", "cada 12 h"]) {
  assert(red.text.includes(kept), `se conserva el dato clínico: ${kept}`);
}
assert(red.total >= 8, `cuenta los identificadores enmascarados (${red.total})`);
assert(redactIdentifiers(red.text).text === red.text, "enmascarar dos veces no cambia el texto");
assert(
  redactIdentifiers("Paciente femenina de 54 años con hipertensión").text ===
    "Paciente femenina de 54 años con hipertensión",
  "no toma 'femenina' por un nombre"
);
assert(
  redactIdentifiers("Plaquetas 250000, folio-lab 12").total === 0,
  "valores de laboratorio no se confunden con teléfonos"
);
assert(
  redactIdentifiers("Fecha de nacimiento 1971-03-12").text.includes("[FECHA NAC.]"),
  "fecha de nacimiento en formato ISO"
);

// --- Salida hacia la IA ---------------------------------------------------
const files = walk(resolve("src")).filter((f) => /\.tsx?$/.test(f));
const callers = files.filter((f) => readFileSync(f, "utf8").includes("api.openai.com"));
assert(
  callers.length === 1 && callers[0].endsWith(join("lib", "ai", "openai.ts")),
  "solo src/lib/ai/openai.ts habla con el proveedor de IA"
);
const helper = readFileSync(resolve("src/lib/ai/openai.ts"), "utf8");
assert(helper.includes("store: false"), "las llamadas piden no almacenar");
assert(!/\buser:/.test(helper), "no se envía identificador de usuario al proveedor");
const notes = readFileSync(resolve("src/lib/profile/extractClinicalProfileFromNotes.ts"), "utf8");
assert(notes.includes("redactIdentifiers"), "la extracción de notas enmascara antes de enviar");
const rationale = readFileSync(resolve("src/lib/matching/generateMatchRationale.ts"), "utf8");
assert(rationale.includes("redactIdentifiers"), "la explicación del matching enmascara la evidencia");
assert(
  readFileSync(resolve("src/app/api/candidato/enviar/route.ts"), "utf8").includes("knownNames"),
  "el portal pasa el nombre del candidato al enmascarado"
);
assert(readFileSync(resolve("src/app/privacidad/page.tsx"), "utf8").includes("Inteligencia artificial"), "el aviso de privacidad informa del uso de IA");

// --- Qué le falta para calificar -----------------------------------------
const patient: Patient = {
  id: "p1",
  clinic_id: "c",
  first_name: "Ana",
  last_name: "Soto",
  birth_date: "1975-05-05",
  gender: "female",
  created_at: "2026-01-01",
};
function profile(labs: Record<string, number>, conditions = ["Diabetes tipo 2"]): ClinicalProfile {
  return {
    id: "cp",
    patient_id: "p1",
    conditions,
    medications: [],
    laboratories: labs,
    updated_at: "2026-01-01",
  };
}
function protocol(id: string, code: string, labs: { name: string; min?: number }[], extra: Partial<Protocol["inclusion_criteria"]> = {}): Protocol {
  return {
    id,
    clinic_id: "c",
    title: code,
    code_name: code,
    status: "active",
    created_at: "2026-01-01",
    inclusion_criteria: { required_conditions: ["Diabetes tipo 2"], required_labs: labs, ...extra },
    exclusion_criteria: {},
  };
}

const protocols = [
  protocol("a", "A-1", [{ name: "HbA1c", min: 7 }]),
  protocol("b", "B-2", [{ name: "HbA1c", min: 7 }, { name: "Creatinina" }]),
  protocol("c", "C-3", [{ name: "HbA1c", min: 7 }, { name: "Creatinina" }, { name: "TGO" }]),
  protocol("d", "D-4", [{ name: "Hemoglobina" }], { max_age: 30 }),
  { ...protocol("e", "E-5", [{ name: "Ferritina" }]), status: "closed" as const },
];

const gaps = buildPatientGaps({ patient, profile: profile({}) }, protocols);
assert(gaps[0]?.label === "HbA1c", "primero el dato que más protocolos cierra");
assert(gaps[0]?.closes === 1 && gaps[0]?.protocols.length === 3, "HbA1c cierra A-1 y suma a B-2 y C-3");
assert(gaps.find((g) => g.label === "Creatinina")?.protocols.length === 2, "Creatinina aparece en dos protocolos");
assert(!gaps.some((g) => g.label === "Hemoglobina"), "no pide datos para un protocolo que ya la descarta por edad");
assert(!gaps.some((g) => g.label === "Ferritina"), "ignora protocolos cerrados");

const afterHba1c = buildPatientGaps({ patient, profile: profile({ hba1c: 8 }) }, protocols);
assert(afterHba1c[0]?.label === "Creatinina" && afterHba1c[0].closes === 1, "con HbA1c cargada, Creatinina cierra B-2");

const noProfile = buildPatientGaps({ patient, profile: null }, protocols);
assert(noProfile.length === 1 && noProfile[0].key === "profile", "sin ficha, lo primero es la ficha clínica");

const complete = buildPatientGaps({ patient, profile: profile({ hba1c: 8, creatinina: 1, tgo: 20 }) }, [protocols[0], protocols[1], protocols[2]]);
assert(complete.length === 0, "paciente completo no tiene faltantes");

// El motor y el plan de faltantes coinciden en qué laboratorios faltan.
for (const proto of protocols.slice(0, 3)) {
  const result = evaluatePatientAgainstProtocol(patient, profile({}), proto);
  const engineMissing = result.details.filter((d) => d.status === "missing").length;
  const planned = gaps.filter((g) => g.protocols.some((p) => p.id === proto.id)).length;
  assert(engineMissing === planned, `${proto.code_name}: el plan lista los mismos faltantes que el motor`);
}

const ui = readFileSync(resolve("src/components/matching/PatientGaps.tsx"), "utf8");
assert(!ui.includes("evidence") && !ui.includes("detail"), "el plan no muestra evidencia clínica");
assert(readFileSync(resolve("src/app/(app)/patients/[id]/page.tsx"), "utf8").includes("PatientGaps"), "el perfil del paciente muestra lo que falta");
assert(readFileSync(resolve("src/app/(app)/rematch/page.tsx"), "utf8").includes("PatientGaps"), "el re-match muestra lo que falta");

if (failed) process.exit(1);
console.log("verify-gaps-privacy: faltantes por paciente y enmascarado hacia la IA OK");

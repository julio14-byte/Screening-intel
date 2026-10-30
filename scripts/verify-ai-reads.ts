import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  enrollmentSnapshots,
  initialsFromVisitLabel,
  missingDecisions,
  morningAppointments,
  zonedTomorrowWindow,
} from "../src/lib/ai/screening-reads";
import { ASSISTANT_TOOLS } from "../src/lib/ai/assistant";

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const missing = missingDecisions([
  {
    status: "screening",
    protocolCode: "DM-1",
    firstName: "Ana",
    lastName: "Ruiz",
    details: [
      {
        status: "missing",
        criterion: "Lab HbA1c",
        evidence: ["Ana Ruiz tiene 8.2"],
      },
      { status: "pass", criterion: "Edad" },
    ],
  },
  {
    status: "randomized",
    protocolCode: "DM-1",
    firstName: "Luis",
    lastName: "Paz",
    details: [{ status: "missing", criterion: "No debe salir" }],
  },
]);
const missingJson = JSON.stringify(missing);
assert(missing.count === 1, "solo cuenta quien sigue en screening");
assert(missing.items[0]?.initials === "A. R.", "usa iniciales");
assert(missing.items[0]?.missing.join("|") === "Lab HbA1c", "lista el criterio faltante");
assert(!missingJson.includes("Ana"), "no manda el nombre");
assert(!missingJson.includes("8.2"), "no manda la evidencia");

assert(initialsFromVisitLabel("Ruiz, Ana") === "A. R.", "la cita convierte el nombre");
const morning = morningAppointments(
  [
    {
      scheduledAt: "2026-10-31T15:00:00.000Z",
      patientName: "Ruiz, Ana",
      protocolCode: "DM-1",
      gap: "pending",
      criterion: "Lab HbA1c",
    },
  ],
  "America/Mexico_City"
);
assert(morning.items[0]?.initials === "A. R.", "la cita de mañana va en iniciales");
assert(morning.items[0]?.gap === "falta información", "explica el hueco");
assert(!JSON.stringify(morning).includes("Ruiz"), "la cita no lleva el apellido");

const goals = enrollmentSnapshots([
  {
    protocolCode: "DM-1",
    pace: "behind",
    randomized: 2,
    target: 10,
    remaining: 8,
    percent: 20,
    daysLeft: 40,
  },
]);
assert(goals.items[0]?.pace === "Atrasado", "la meta usa el ritmo en español");
assert(goals.items[0]?.remaining === 8, "cuenta los randomizados que faltan");

const window = zonedTomorrowWindow(
  new Date("2026-10-30T18:00:00.000Z"),
  "America/Mexico_City"
);
const visit = new Date("2026-10-31T15:00:00.000Z").getTime();
const lateNight = new Date("2026-10-31T05:00:00.000Z").getTime();
assert(
  visit >= window.start.getTime() && visit < window.end.getTime(),
  "mañana en México incluye la cita de las 9"
);
assert(
  lateNight < window.start.getTime(),
  "la noche de hoy en México no cuenta como mañana"
);

const names = ASSISTANT_TOOLS.map((tool) => tool.function.name);
assert(names.includes("datos_que_faltan"), "el asistente lee lo que falta");
assert(names.includes("citas_de_manana"), "el asistente lee las citas de mañana");
assert(names.includes("meta_de_enrolamiento"), "el asistente lee la meta");

const page = readFileSync(resolve("src/app/(app)/asistente/page.tsx"), "utf8");
assert(page.includes("¿Qué citas hay mañana?"), "la pantalla ofrece las tres preguntas");
assert(page.includes("meta de enrolamiento"), "la pantalla pregunta la meta");

if (failed) process.exit(1);
console.log("verify-ai-reads: faltantes, citas de mañana y meta OK");

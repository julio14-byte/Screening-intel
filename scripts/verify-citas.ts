import {
  findConflicts,
  groupByDay,
  isOverdue,
  phoneDigits,
  reminderMessage,
  whatsappUrl,
  type VisitRow,
} from "../src/lib/ops/visits";

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function visit(partial: Partial<VisitRow> & { scheduled_at: string }): VisitRow {
  return {
    id: "v",
    patient_id: "p1",
    protocol_id: null,
    location: "",
    status: "scheduled",
    notes: "",
    kind: "consulta",
    clinician_name: "",
    patient: {
      first_name: "María",
      last_name: "Gómez",
      subject_code: "001",
      phone: "55 1234 5678",
      email: null,
    },
    protocol_code: null,
    ...partial,
  };
}

const at = new Date("2026-10-08T10:00:00");

assert(phoneDigits("55 1234 5678") === "525512345678", "10 dígitos asume México");
assert(phoneDigits("+54 11 5555-0101") === "541155550101", "internacional conserva país");
assert(phoneDigits("123") === null, "teléfono corto inválido");
assert(phoneDigits(null) === null, "sin teléfono");

const near = visit({ scheduled_at: new Date("2026-10-08T10:30:00").toISOString() });
assert(
  findConflicts([near], { patientId: "p1", at, location: "", clinician: "" }).patient,
  "detecta cita del mismo paciente en <1 h"
);
const room = visit({
  patient_id: "p2",
  location: "Consultorio 1",
  scheduled_at: new Date("2026-10-08T10:15:00").toISOString(),
});
assert(
  findConflicts([room], { patientId: "p1", at, location: "consultorio 1", clinician: "" }).resource,
  "detecta sede ocupada (sin distinguir mayúsculas)"
);
assert(
  !findConflicts([room], { patientId: "p1", at, location: "Consultorio 2", clinician: "" }).resource,
  "sede distinta no choca"
);
const far = visit({ scheduled_at: new Date("2026-10-08T13:00:00").toISOString() });
assert(
  !findConflicts([far], { patientId: "p1", at, location: "", clinician: "" }).patient,
  "citas lejanas no chocan"
);
const cancelled = visit({
  status: "cancelled",
  scheduled_at: new Date("2026-10-08T10:00:00").toISOString(),
});
assert(
  !findConflicts([cancelled], { patientId: "p1", at, location: "", clinician: "" }).patient,
  "citas canceladas no chocan"
);

assert(
  isOverdue(visit({ scheduled_at: "2020-01-01T10:00:00.000Z" })),
  "cita programada pasada queda por cerrar"
);
assert(
  !isOverdue(visit({ scheduled_at: "2020-01-01T10:00:00.000Z", status: "completed" })),
  "cita hecha no queda por cerrar"
);

const grouped = groupByDay([
  visit({ id: "b", scheduled_at: new Date("2026-10-09T09:00:00").toISOString() }),
  visit({ id: "a", scheduled_at: new Date("2026-10-08T09:00:00").toISOString() }),
]);
assert(grouped.length === 2 && grouped[0][0] === "2026-10-08", "agrupa por día ordenado");

const message = reminderMessage(visit({ scheduled_at: at.toISOString(), location: "Consultorio 1" }));
assert(message.includes("María") && message.includes("Consultorio 1"), "mensaje incluye nombre y sede");
assert(!message.includes("Gómez") && !message.includes("001"), "mensaje no incluye apellido ni código de sujeto");
assert(whatsappUrl("525512345678", "hola mundo").includes("text=hola%20mundo"), "URL de WhatsApp codificada");

if (failed > 0) {
  console.error(`\n${failed} verificación(es) de citas fallaron.`);
  process.exit(1);
}
console.log("verify-citas: OK");

import {
  demographicsFromPatient,
  demographicsToRow,
  ethnicityLabel,
  isMissingDemographicsColumn,
  studySubjectCaption,
} from "../src/lib/profile/demographics";
import { parseEthnicity, parsePatientCsv } from "../src/lib/import/parsePatientCsv";
import type { Patient } from "../src/lib/types";
import { calculateAge } from "../src/lib/utils";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const patient: Patient = {
  id: "1",
  clinic_id: "org",
  first_name: "María",
  last_name: "González",
  birth_date: "1962-04-12",
  gender: "female",
  subject_code: "10001",
  ethnicity: "mestizo",
  phone: "+54 11 5555-0101",
  email: "maria.g@example.com",
  created_at: "2026-01-01T00:00:00Z",
};

assert(studySubjectCaption(patient) === "Sujeto 10001", "caption de sujeto");
assert(ethnicityLabel("mestizo") === "Mestizo/a", "etiqueta etnia");
assert(parseEthnicity("Afrodescendiente") === "afrodescendiente", "parse etnia");
assert(parseEthnicity("caucásica") === "blanco", "parse caucásica");

const demo = demographicsFromPatient(patient);
assert(demo.phone === "+54 11 5555-0101", "hidrata teléfono");
const row = demographicsToRow(demo);
assert(row.subject_code === "10001", "conserva código");
assert(row.ethnicity === "mestizo", "conserva etnia");

try {
  demographicsToRow({ ...demo, subject_code: "12" });
  throw new Error("debía rechazar código corto");
} catch (error) {
  assert(
    error instanceof Error && error.message.includes("4 a 12"),
    "valida código numérico"
  );
}

assert(calculateAge("1962-04-12") >= 63, "edad desde fecha de nacimiento");

const csv = parsePatientCsv(
  "first_name,last_name,birth_date,gender,phone,ethnicity,subject_code,peso,estatura\nAna,Test,1990-01-01,female,+54 11 1,mestiza,10009,70,170"
);
assert(csv[0].ethnicity === "mestizo", "CSV etnia");
assert(csv[0].subject_code === "10009", "CSV código");
assert(csv[0].phone === "+54 11 1", "CSV teléfono");
assert(csv[0].laboratories.imc === 24.2, "CSV no mezcla etnia con labs");

assert(
  isMissingDemographicsColumn(
    "Could not find the 'subject_code' column of 'patients' in the schema cache"
  ),
  "detecta columna faltante"
);
assert(
  !isMissingDemographicsColumn(
    'duplicate key value violates unique constraint "patients_clinic_subject_code_uidx"'
  ),
  "no confunde unique con columna faltante"
);

console.log("ok: datos demográficos, código de sujeto y etnia");

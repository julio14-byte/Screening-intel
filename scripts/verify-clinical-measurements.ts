import {
  computeBmi,
  extraLaboratories,
  mergeLaboratories,
  withComputedBmi,
} from "../src/lib/profile/clinical-measurements";
import { parsePatientCsv } from "../src/lib/import/parsePatientCsv";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

assert(computeBmi(72, 158) === 28.8, "IMC 72 kg / 158 cm");
assert(computeBmi(undefined, 158) === null, "IMC sin peso");
assert(withComputedBmi({ peso: 91, estatura: 175 }).imc === 29.7, "IMC merge");
assert(!("imc" in withComputedBmi({ peso: 70 })), "IMC se borra sin estatura");

const extra = extraLaboratories({ glucosa: 110, hba1c: 7.2, pas: 120 });
assert(extra.hba1c === 7.2 && extra.glucosa == null, "hba1c queda en otros analitos");

const merged = mergeLaboratories({ glucosa: 110, pas: 120 }, { hba1c: 7.2 });
assert(merged.glucosa === 110 && merged.hba1c === 7.2 && merged.pas === 120, "merge catalog+extra");

const csv = parsePatientCsv(
  "first_name,last_name,birth_date,gender,peso,estatura\nAna,Test,1990-01-01,female,70,170"
);
assert(csv[0].laboratories.imc === 24.2, "CSV calcula IMC");

console.log("ok: mediciones clínicas, IMC y CSV");

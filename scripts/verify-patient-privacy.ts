import { toPatientInitials } from "../src/lib/utils";

const cases: Array<[string, string, string]> = [
  ["María", "García", "M. G."],
  ["ana", "lopez", "A. L."],
  ["", "Pérez", "?. P."],
  ["Juan", "", "J. ?."],
];

let failed = 0;
for (const [first, last, expected] of cases) {
  const got = toPatientInitials(first, last);
  if (got !== expected) {
    console.error(`toPatientInitials(${JSON.stringify(first)}, ${JSON.stringify(last)}) => ${JSON.stringify(got)}, esperado ${JSON.stringify(expected)}`);
    failed += 1;
  }
}

if (failed) {
  process.exit(1);
}

console.log("verify-patient-privacy: iniciales OK");

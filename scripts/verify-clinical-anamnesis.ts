import {
  hydrateAnamnesis,
  matchingConditions,
  matchingMedications,
} from "../src/lib/profile/anamnesis";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const fromLegacy = hydrateAnamnesis({
  conditions: ["diabetes tipo 2", "hipertensión"],
  medications: ["metformina"],
});
assert(fromLegacy.diagnoses.length === 2, "hidrata diagnósticos desde conditions");
assert(fromLegacy.medications[0]?.dose === "", "medicación legacy sin dosis");
assert(
  matchingConditions(fromLegacy).join(",") === "diabetes tipo 2,hipertensión",
  "nombres para matching"
);

const withDetail = hydrateAnamnesis({
  conditions: ["asma"],
  medications: ["salbutamol"],
  anamnesis: {
    diagnoses: [
      {
        id: "1",
        name: "asma",
        diagnosed_at: "2010-01-01",
        symptoms: "sibilancias",
        severity: "leve",
        evolution: "estable",
      },
    ],
    surgeries: "ninguna",
    hospitalizations: "",
    medications: [
      {
        id: "2",
        name: "salbutamol",
        kind: "farmaco",
        dose: "100 mcg",
        schedule: "SOS",
        status: "current",
      },
    ],
    allergies: [
      {
        id: "3",
        substance: "aspirina",
        category: "medicamento",
        reaction: "broncoespasmo",
      },
    ],
  },
});
assert(withDetail.diagnoses[0]?.diagnosed_at === "2010-01-01", "conserva fecha");
assert(withDetail.allergies[0]?.category === "medicamento", "alergia a fármaco");
assert(matchingMedications(withDetail)[0] === "salbutamol", "proyección medicación");

console.log("ok: anamnesis hidrata y proyecta al matching");

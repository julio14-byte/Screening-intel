import { firstEmbedded } from "../src/lib/supabase/embed";
import type { ClinicalProfile } from "../src/lib/types";

const profile: ClinicalProfile = {
  id: "cp-1",
  patient_id: "p-1",
  conditions: ["diabetes tipo 2"],
  medications: ["metformina"],
  laboratories: { hba1c: 7.8 },
  updated_at: "2026-09-24T00:00:00.000Z",
};

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const fromObject = firstEmbedded(profile);
assert(fromObject?.conditions[0] === "diabetes tipo 2", "embed objeto");

const fromArray = firstEmbedded([profile]);
assert(fromArray?.id === "cp-1", "embed array");

assert(firstEmbedded(null) === null, "embed null");
assert(firstEmbedded(undefined) === null, "embed undefined");
assert(firstEmbedded([] as ClinicalProfile[]) === null, "embed array vacío");

console.log("ok: firstEmbedded unwraps unique clinical_profiles embed");

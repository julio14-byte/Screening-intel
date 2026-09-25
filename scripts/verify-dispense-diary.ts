import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FIRST_DOSE_MODE_LABEL,
  hashDiaryToken,
  isMissingDispenseSchema,
  newDiaryToken,
} from "../src/lib/pharmacy/dispense";

const sql = readFileSync(
  resolve("supabase/migrations/20260925010000_dispense_first_dose_diary.sql"),
  "utf8"
);
const config = readFileSync(resolve("src/config.ts"), "utf8");

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("kit_code text not null default ''"), "caja IWRS en receta");
assert(sql.includes("first_dose_at"), "timestamp de primera dosis");
assert(sql.includes("first_dose_mode"), "modo clínica o casa");
assert(sql.includes("'clinic', 'home'"), "modos permitidos");
assert(sql.includes("dosing_diary_entries"), "tabla de diario");
assert(sql.includes("dosing_diary_links"), "tabla de links");
assert(
  sql.includes("unique (patient_id, protocol_id, diary_on)"),
  "una toma por día y protocolo"
);
assert(sql.includes("length(token_hash) = 64"), "hash SHA-256 en hex");
assert(sql.includes("enable row level security"), "RLS");
assert(
  sql.includes("revoke all on table public.dosing_diary_entries from anon, public"),
  "diario sin GRANT anon"
);
assert(
  sql.includes("revoke all on table public.dosing_diary_links from anon, public"),
  "links sin GRANT anon"
);
assert(!/grant delete/i.test(sql), "sin DELETE autenticado");
assert(sql.includes("can_write_clinical_data()"), "escritura clínica");
assert(
  sql.includes("El diario vive en Crisvia"),
  "diario en la misma app, no una aparte"
);

const token = newDiaryToken();
assert(token.length >= 24, "token largo");
assert(!/[+/=]/.test(token), "token URL-safe");
assert(hashDiaryToken(token).length === 64, "hash de 64 hex");
assert(
  hashDiaryToken(token) === hashDiaryToken(token),
  "hash determinista"
);
assert(
  hashDiaryToken(token) !== hashDiaryToken(newDiaryToken()),
  "tokens distintos, hashes distintos"
);
assert(
  isMissingDispenseSchema(
    "Could not find the table 'public.dosing_diary_entries' in the schema cache"
  ),
  "detecta schema de diario faltante"
);
assert(
  !isMissingDispenseSchema("duplicate key value violates unique constraint"),
  "no confunde unique con schema faltante"
);
assert(
  FIRST_DOSE_MODE_LABEL.clinic.includes("clínica"),
  "etiqueta clínica"
);
assert(FIRST_DOSE_MODE_LABEL.home.includes("casa"), "etiqueta casa");

assert(config.includes('href: "/dispensacion"'), "nav de dispensación");
assert(
  config.includes('"/api/diario/t"'),
  "API pública del diario acotada a /api/diario/t"
);
assert(
  !config.includes('"/api/diario",'),
  "link y entries del diario no son APIs públicas"
);
assert(config.includes('dispensacion: "/dispensacion"'), "ruta canónica");
assert(
  config.includes("Clinical Ink") || config.includes("app aparte"),
  "FAQ aclara que no es una app aparte"
);

if (failed) process.exit(1);
console.log("verify-dispense-diary: caja IWRS, primera dosis, diario /diario OK");

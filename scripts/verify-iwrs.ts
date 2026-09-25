import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  allocationRatioLabel,
  buildPermutedBlock,
  isMissingIwrsSchema,
  isNeedBlockError,
  normalizeBlockSize,
} from "../src/lib/iwrs/model";

const sql = readFileSync(
  resolve("supabase/migrations/20260924150000_iwrs_randomization.sql"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("protocol_iwrs_config"), "tabla de config IWRS");
assert(sql.includes("protocol_arms"), "tabla de brazos");
assert(sql.includes("iwrs_slots"), "lista ciega de slots");
assert(sql.includes("iwrs_randomizations"), "asignaciones");
assert(sql.includes("iwrs_arm_assignments"), "brazo en tabla separada");
assert(sql.includes("iwrs_append_block"), "RPC append de bloque");
assert(sql.includes("iwrs_randomize"), "RPC randomizar");
assert(sql.includes("iwrs_unblind"), "RPC desenlace");
assert(sql.includes("iwrs_arm_visible"), "visibilidad del brazo");
assert(sql.includes("NEED_BLOCK"), "señal de bloque vacío");
assert(sql.includes("enable row level security"), "RLS");
assert(
  sql.includes("revoke all on table public.iwrs_slots from anon, authenticated, public"),
  "slots sin GRANT a authenticated"
);
assert(!/grant select on table public.iwrs_slots/i.test(sql), "sin SELECT de slots");
assert(sql.includes("can_write_clinical_data()"), "escritura clínica para randomizar");
assert(sql.includes("is_clinical_lead()"), "PI/sub para desenmascarar");
assert(
  sql.includes("Este protocolo usa IWRS. Randomizá desde el módulo IWRS"),
  "trigger bloquea arrastre a randomizado"
);
assert(sql.includes("revoke all on function public.iwrs_randomize(uuid) from anon"), "RPC sin anon");

const oneToOne = [
  { id: "A", allocation_weight: 1 },
  { id: "B", allocation_weight: 1 },
];
const block = buildPermutedBlock(oneToOne, 4);
assert(block.length === 4, "bloque 1:1 tamaño 4");
assert(block.filter((id) => id === "A").length === 2, "dos de A");
assert(block.filter((id) => id === "B").length === 2, "dos de B");
assert(normalizeBlockSize(oneToOne, 4) === 4, "normaliza 4");
assert(normalizeBlockSize(oneToOne, 5) === 6, "5 se ajusta a múltiplo de la razón");

const twoToOne = [
  { id: "A", allocation_weight: 2, code: "ACT" },
  { id: "B", allocation_weight: 1, code: "PLC" },
];
const block21 = buildPermutedBlock(twoToOne, 6);
assert(block21.filter((id) => id === "A").length === 4, "2:1 → cuatro activo");
assert(block21.filter((id) => id === "B").length === 2, "2:1 → dos placebo");
assert(
  allocationRatioLabel(twoToOne) === "2:1 (ACT:PLC)",
  "etiqueta de razón"
);

try {
  buildPermutedBlock([{ id: "A", allocation_weight: 1 }], 4);
  assert(false, "un brazo debe fallar");
} catch (error) {
  assert(
    error instanceof Error && error.message.includes("dos brazos"),
    "exige al menos dos brazos"
  );
}

assert(isNeedBlockError("NEED_BLOCK"), "detecta NEED_BLOCK");
assert(
  isMissingIwrsSchema(
    "Could not find the table 'public.iwrs_randomizations' in the schema cache"
  ),
  "detecta schema IWRS faltante"
);
assert(
  !isMissingIwrsSchema("duplicate key value violates unique constraint"),
  "no confunde unique con schema faltante"
);

if (failed) process.exit(1);
console.log("verify-iwrs: bloques permutados, RLS ciega y RPCs OK");

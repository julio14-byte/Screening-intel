import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatQuantity, isLowStock, parseQuantity } from "../src/lib/pharmacy/model";

const sql = readFileSync(
  resolve("supabase/migrations/20260924001000_protocol_medication_inventory.sql"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("protocol_study_medications"), "tabla de medicamentos del protocolo");
assert(sql.includes("medication_lots"), "tabla de lotes");
assert(sql.includes("prescriptions"), "tabla de recetas");
assert(sql.includes("inventory_movements"), "kardex");
assert(sql.includes("deliver_study_prescription"), "entrega atómica");
assert(sql.includes("quantity_on_hand = quantity_on_hand - rx.quantity"), "descuenta stock");
assert(sql.includes("enable row level security"), "RLS");
assert(sql.includes("can_write_clinical_data()"), "escritura clínica");
assert(sql.includes("revoke all on table public.prescriptions from anon"), "sin GRANT anon");
assert(!/grant delete/i.test(sql), "sin DELETE autenticado");

assert(parseQuantity("12") === 12, "parsea cantidad");
assert(parseQuantity(0) === null, "rechaza cero");
assert(formatQuantity(8, "tabletas") === "8 tabletas", "formatea cantidad");
assert(isLowStock(0, 20) === true, "stock en cero es bajo");
assert(isLowStock(10, 20) === false, "50% no es bajo");

if (failed) process.exit(1);
console.log("verify-pharmacy-inventory: esquema, RLS y descuento de lote OK");

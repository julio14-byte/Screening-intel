import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isDeliveryDate,
  isPlausibleDeliveryDate,
} from "../src/lib/pharmacy/delivery";

const sql = readFileSync(
  resolve("supabase/migrations/20261021060000_medication_delivered_on.sql"),
  "utf8"
);
const route = readFileSync(resolve("src/app/api/pharmacy/dispense/route.ts"), "utf8");
const board = readFileSync(resolve("src/components/pharmacy/DispenseBoard.tsx"), "utf8");
const page = readFileSync(resolve("src/app/(app)/dispensacion/page.tsx"), "utf8");
const config = readFileSync(resolve("src/config.ts"), "utf8");
const protocolPage = readFileSync(
  resolve("src/app/(app)/protocols/[id]/page.tsx"),
  "utf8"
);
const followUp = readFileSync(resolve("src/app/api/follow-up/generar/route.ts"), "utf8");

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("medication_delivered_on"), "columna de fecha de entrega");
assert(sql.includes("status = 'randomized'"), "solo en randomizado");
assert(sql.includes("clear_delivery_unless_randomized"), "se borra si sale de randomizado");
assert(!sql.includes("medication_lots"), "la migración no crea lotes");
assert(!existsSync(resolve("src/app/(app)/inventario/page.tsx")), "no hay página de inventario");
assert(
  !existsSync(resolve("src/app/api/pharmacy/inventory/route.ts")),
  "no hay API de inventario"
);
assert(
  !existsSync(resolve("src/app/api/pharmacy/lots/route.ts")),
  "no hay API de lotes"
);
assert(!config.includes('href: "/inventario"'), "el menú no tiene inventario");
assert(config.includes('href: "/dispensacion"'), "dispensación sigue en el menú");
assert(!route.includes("lot_id"), "la API no pide lote");
assert(!route.includes("quantity"), "la API no pide cantidad");
assert(!route.includes("kit_code"), "la API no pide kit");
assert(!route.includes("first_dose"), "la API no pide primera dosis");
assert(route.includes("medication_delivered_on"), "la API guarda la fecha");
assert(route.includes("delivered_on"), "el cuerpo lleva la fecha");
assert(!board.includes("lote"), "la pantalla no habla de lotes");
assert(!board.includes("inventario"), "la pantalla no habla de inventario");
assert(!board.includes("primera dosis"), "la pantalla no pide primera dosis");
assert(board.includes("Fecha de entrega"), "la pantalla pide la fecha");
assert(page.includes("Fecha de entrega"), "el título es la fecha de entrega");
assert(!protocolPage.includes("ProtocolStudyMedsPanel"), "el protocolo no carga inventario");
assert(
  followUp.includes("medication_delivered_on"),
  "el día 0 de seguimiento usa la fecha de entrega"
);
assert(!followUp.includes("first_dose_at"), "seguimiento ya no busca la primera dosis");
assert(isDeliveryDate("2026-10-21"), "acepta una fecha calendario");
assert(!isDeliveryDate("2026-02-31"), "rechaza un día imposible");
assert(!isDeliveryDate("21/10/2026"), "rechaza otro formato");
assert(
  isPlausibleDeliveryDate("2026-10-21", new Date("2026-10-21T15:00:00Z")),
  "acepta el día de hoy"
);
assert(
  !isPlausibleDeliveryDate("2026-12-01", new Date("2026-10-21T15:00:00Z")),
  "rechaza una fecha futura lejana"
);

if (failed) process.exit(1);
console.log("verify-dispense-date: inventario fuera y dispensación solo con fecha OK");

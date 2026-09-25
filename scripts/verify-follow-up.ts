import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  addUtcDays,
  adherencePercent,
  isDateInWindow,
  reimbursementTotal,
  statusAfterActualDate,
  visitWindow,
} from "../src/lib/follow-up/model";

const sql = readFileSync(
  resolve("supabase/migrations/20260925030000_follow_up_visits.sql"),
  "utf8"
);
const config = readFileSync(resolve("src/config.ts"), "utf8");
const permissions = readFileSync(resolve("src/lib/rbac/permissions.ts"), "utf8");
const completar = readFileSync(
  resolve("src/app/api/follow-up/completar/route.ts"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("protocol_visit_schedules"), "tabla calendario");
assert(sql.includes("follow_up_visits"), "tabla instancias");
assert(sql.includes("target_day"), "día objetivo");
assert(sql.includes("window_before_days"), "ventana −");
assert(sql.includes("window_after_days"), "ventana +");
assert(sql.includes("'scheduled', 'completed', 'out_of_window', 'missed'"), "estados");
assert(sql.includes("protocol_deviation"), "flag de desviación");
assert(sql.includes("follow_up_apply_window"), "trigger de ventana");
assert(sql.includes("pills_dispensed"), "pastillas entregadas");
assert(sql.includes("pills_returned"), "pastillas devueltas");
assert(sql.includes("adherence_pct"), "adherencia");
assert(sql.includes("systolic"), "signos vitales");
assert(sql.includes("adverse_event"), "evento adverso");
assert(sql.includes("transport_amount"), "viático transporte");
assert(sql.includes("meals_amount"), "viático comidas");
assert(sql.includes("can_write_clinical_data()"), "escritura clínica");
assert(sql.includes("enable row level security"), "RLS");
assert(!/grant delete/i.test(sql), "sin DELETE");
assert(
  sql.includes("revoke all on table public.follow_up_visits from anon, public"),
  "sin GRANT anon"
);

assert(addUtcDays("2026-01-01", 14) === "2026-01-15", "día 14 desde 1-ene");
const window = visitWindow({
  baselineOn: "2026-01-01",
  targetDay: 14,
  windowBeforeDays: 2,
  windowAfterDays: 2,
});
assert(window.targetOn === "2026-01-15", "target");
assert(window.windowStartOn === "2026-01-13", "inicio ventana");
assert(window.windowEndOn === "2026-01-17", "fin ventana");
assert(isDateInWindow("2026-01-15", window.windowStartOn, window.windowEndOn), "dentro");
assert(!isDateInWindow("2026-01-12", window.windowStartOn, window.windowEndOn), "antes");
assert(
  statusAfterActualDate("2026-01-15", window.windowStartOn, window.windowEndOn).status ===
    "completed",
  "completa en ventana"
);
assert(
  statusAfterActualDate("2026-01-12", window.windowStartOn, window.windowEndOn)
    .protocolDeviation === true,
  "desviación fuera de ventana"
);
assert(adherencePercent(28, 4) === 85.7, "adherencia 24/28");
assert(adherencePercent(10, 11) === null, "devueltas > entregadas");
assert(reimbursementTotal(1500.5, 800.25) === 2300.75, "reembolso");

assert(config.includes('href: "/seguimiento"'), "nav seguimiento");
assert(config.includes('seguimiento: "/seguimiento"'), "ruta canónica");
assert(permissions.includes('"/api/follow-up"'), "WRITE API follow-up");
assert(completar.includes("statusAfterActualDate"), "completa aplica ventana");
assert(completar.includes("systolic"), "vitales obligatorios en API");
assert(completar.includes("recordCustomAuditEvent"), "bitácora al completar");

if (failed) process.exit(1);
console.log("verify-follow-up: calendario, ventana −2/+2, adherencia y desviación OK");

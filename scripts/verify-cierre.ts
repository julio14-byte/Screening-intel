import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANALYSIS_DISCLAIMER,
  CLOSEOUT_PHASES,
  LOCK_ATTESTATION_HINT,
  REGULATORY_AGENCIES,
  buildAnalysisSnapshot,
  buildCsrMarkdown,
  mean,
  percent,
  phaseReached,
} from "../src/lib/cierre/model";

const sql = readFileSync(
  resolve("supabase/migrations/20260925040000_protocol_closeout.sql"),
  "utf8"
);
const config = readFileSync(resolve("src/config.ts"), "utf8");
const permissions = readFileSync(resolve("src/lib/rbac/permissions.ts"), "utf8");
const unblindIwrs = readFileSync(resolve("src/app/api/iwrs/unblind/route.ts"), "utf8");
const lockRoute = readFileSync(resolve("src/app/api/cierre/lock/route.ts"), "utf8");
const studyUnblind = readFileSync(resolve("src/app/api/cierre/unblind/route.ts"), "utf8");

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("protocol_closeouts"), "tabla cierre");
assert(sql.includes("closeout_queries"), "tabla queries");
assert(sql.includes("'cleaning', 'locked', 'unblinded', 'analyzed', 'csr', 'submitted'"), "fases");
assert(sql.includes("protocol_database_locked"), "helper lock");
assert(sql.includes("enforce_protocol_database_lock"), "trigger freeze");
assert(sql.includes("closeout_lock"), "RPC lock");
assert(sql.includes("closeout_unblind_study"), "RPC apertura del ciego");
assert(sql.includes("closeout_scan"), "escaneo de limpieza");
assert(sql.includes("iwrs_unblind"), "no se borra el desenlace de emergencia");
assert(sql.includes("enable row level security"), "RLS");
assert(!/grant delete/i.test(sql), "sin DELETE");
assert(sql.includes("revoke all on table public.protocol_closeouts from anon, public"), "sin GRANT anon");
assert(sql.includes("get_user_app_role() = 'monitor'"), "monitor abre queries");

assert(percent(2, 10) === 20, "20% EA");
assert(mean([80, 90, 100]) === 90, "media");
assert(phaseReached("locked", "cleaning"), "lock supera limpieza");
assert(!phaseReached("cleaning", "locked"), "limpieza no es lock");
assert(CLOSEOUT_PHASES[0] === "cleaning", "empieza en limpieza");
assert(REGULATORY_AGENCIES.includes("COFEPRIS"), "COFEPRIS");
assert(REGULATORY_AGENCIES.includes("FDA"), "FDA");
assert(LOCK_ATTESTATION_HINT.length >= 20, "declaración de lock");

const snapshot = buildAnalysisSnapshot({
  now: new Date("2026-09-25T00:00:00.000Z"),
  screenFailures: 3,
  assignments: [
    { patientId: "a", armCode: "ACT", armName: "Activo" },
    { patientId: "b", armCode: "PBO", armName: "Placebo" },
  ],
  visits: [
    {
      patientId: "a",
      status: "completed",
      adverseEvent: true,
      adherencePct: 90,
      protocolDeviation: false,
    },
    {
      patientId: "b",
      status: "out_of_window",
      adverseEvent: false,
      adherencePct: 80,
      protocolDeviation: true,
    },
  ],
});
assert(snapshot.n_randomized === 2, "n randomizados");
assert(snapshot.n_screen_failure === 3, "screen failures");
assert(snapshot.overall_ae_n === 1, "un paciente con EA");
assert(snapshot.overall_ae_pct === 50, "50% de randomizados con EA");
assert(snapshot.overall_mean_adherence === 85, "adherencia media");
assert(snapshot.overall_deviations === 1, "una desviación");
assert(snapshot.disclaimer === ANALYSIS_DISCLAIMER, "disclaimer SAS/R");

const csr = buildCsrMarkdown({
  protocolCode: "GLP1-01",
  protocolTitle: "Demo",
  closeout: {
    phase: "csr",
    locked_at: "2026-09-25",
    unblinded_at: "2026-09-26",
    lock_attestation: LOCK_ATTESTATION_HINT,
    unblind_reason: "Apertura del ciego tras Database Lock.",
  },
  snapshot,
  queries: [
    { status: "closed", description: "Falta PAS en V2", answer_notes: "Se cargó 128/82" },
  ],
  deviations: 1,
});
assert(csr.includes("Clinical Study Report"), "título CSR");
assert(csr.includes("no lo envía"), "no envía a agencias");
assert(/SAS|R/.test(csr), "menciona SAS/R");
assert(csr.includes("COFEPRIS"), "menciona COFEPRIS");
assert(csr.includes("Fase IV"), "Fase IV");
assert(csr.includes("Database Lock"), "lock en CSR");

assert(config.includes('href: "/cierre"'), "nav cierre");
assert(config.includes('cierre: "/cierre"'), "ruta canónica");
assert(config.includes("Database Lock"), "FAQ lock");
assert(!permissions.includes('"/api/cierre"'), "monitor no bloqueado en middleware");
assert(lockRoute.includes("closeout_lock"), "API lock");
assert(studyUnblind.includes("closeout_unblind_study"), "API unblind estudio");
assert(unblindIwrs.includes("iwrs_unblind"), "emergencia IWRS intacta");
assert(unblindIwrs.includes("Desenlace de emergencia"), "copy emergencia");

if (failed) process.exit(1);
console.log("verify-cierre: lock, unblind, snapshot, CSR y honestidad regulatoria OK");

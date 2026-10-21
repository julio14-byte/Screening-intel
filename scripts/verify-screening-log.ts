import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildScreeningLog,
  NO_SUBJECT_CODE,
  screeningLogToCsv,
  summarizeScreeningLog,
} from "../src/lib/screening-log/log";
import { emptySiteProfile } from "../src/lib/site/profile";
import type { ScreeningStatus, ScreeningWithRelations } from "../src/lib/types";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function row(
  id: string,
  status: ScreeningStatus,
  createdAt: string,
  opts: {
    code?: string | null;
    protocol?: string;
    reason?: string;
    recorded?: string;
    first?: string;
    last?: string;
  } = {}
): ScreeningWithRelations {
  const protocol = opts.protocol ?? "p1";
  return {
    id,
    patient_id: `pt-${id}`,
    protocol_id: protocol,
    status,
    match_score: 80,
    match_details: [],
    failure_reason: opts.reason ?? null,
    failure_recorded_at: opts.recorded ?? null,
    created_at: createdAt,
    updated_at: "2026-03-01T10:00:00Z",
    patients: {
      id: `pt-${id}`,
      clinic_id: "c1",
      first_name: opts.first ?? "Ana",
      last_name: opts.last ?? "Soto",
      birth_date: "1980-01-01",
      gender: "female",
      created_at: createdAt,
      subject_code: opts.code === undefined ? "100001" : opts.code,
    },
    protocols: { id: protocol, title: `Estudio ${protocol}`, code_name: protocol.toUpperCase(), status: "active" },
  } as ScreeningWithRelations;
}

const rows = [
  row("c", "randomized", "2026-02-03T09:00:00Z", { code: "100003" }),
  row("a", "screening", "2026-02-01T09:00:00Z", { code: "100001" }),
  row("b", "screen_failure", "2026-02-02T09:00:00Z", {
    code: "100002",
    first: "Beatriz",
    last: "Luna",
    reason: "Beatriz Luna no cumple HbA1c; contacto beatriz@correo.mx",
    recorded: "2026-02-10T12:00:00Z",
  }),
  row("d", "pre_screening", "2026-02-04T09:00:00Z", { code: "100004" }),
  row("e", "screening", "2026-02-05T09:00:00Z", { code: null }),
  row("f", "randomized", "2026-02-06T09:00:00Z", { code: "200001", protocol: "p2" }),
];

const log = buildScreeningLog(rows);
assert(log.length === 5, "excluye pre-screening por defecto");
assert(log.map((e) => e.seq).join() === "1,2,3,4,5", "numeración consecutiva");
assert(
  log.map((e) => e.screenedOn).join() ===
    "2026-02-01,2026-02-02,2026-02-03,2026-02-05,2026-02-06",
  "orden cronológico por fecha de screening"
);
assert(buildScreeningLog(rows, { includePreScreening: true }).length === 6, "puede incluir pre-screening");

const p1 = buildScreeningLog(rows, { protocolId: "p1" });
assert(p1.length === 4 && p1[0].seq === 1 && p1.at(-1)?.seq === 4, "numeración por protocolo");

const failure = log.find((e) => e.screeningId === "b")!;
assert(failure.outcomeOn === "2026-02-10", "fecha de resultado del screen failure");
assert(!/Beatriz|Luna|beatriz@/.test(failure.failureReason), "el motivo no conserva nombre ni correo");
assert(/HbA1c/.test(failure.failureReason), "el motivo clínico se conserva");
assert(log.find((e) => e.screeningId === "a")!.outcomeOn === "", "en curso no tiene fecha de resultado");
assert(log.find((e) => e.screeningId === "e")!.subjectCode === NO_SUBJECT_CODE, "sujeto sin código se marca");

const summary = summarizeScreeningLog(p1);
assert(summary.screened === 4 && summary.randomized === 1 && summary.screenFailures === 1, "resumen por estado");
assert(summary.inProgress === 2 && summary.screenFailureRate === 50, "en curso y % de screen failure");
assert(summary.withoutSubjectCode === 1, "cuenta sujetos sin código");

const site = { ...emptySiteProfile(), site_name: "Centro Reforma", pi_name: "Dra. Soto", city: "CDMX" };
const csv = screeningLogToCsv(log, site, new Date("2026-03-01T00:00:00Z"));
assert(csv.startsWith("Bitácora de screening,Centro Reforma"), "CSV con encabezado del sitio");
assert(csv.includes("Investigador principal,Dra. Soto"), "CSV con investigador principal");
assert(csv.includes("no,codigo_sujeto,protocolo_codigo"), "CSV con columnas");
assert(!/Soto,|Ana|Beatriz|Luna|@correo/.test(csv.split("no,codigo_sujeto")[1]), "CSV sin nombres de pacientes");
assert(!screeningLogToCsv(log).startsWith("Bitácora"), "CSV sin sitio no inventa encabezado");

const injection = buildScreeningLog([
  row("x", "screen_failure", "2026-02-01T09:00:00Z", { reason: "=HYPERLINK(\"http://x\")" }),
]);
assert(screeningLogToCsv(injection).includes("'=HYPERLINK"), "CSV neutraliza fórmulas");

const view = read("src/components/screening-log/ScreeningLogView.tsx");
const page = read("src/app/(app)/bitacora/page.tsx");
const config = read("src/config.ts");
assert(page.includes("ScreeningLogView"), "página de bitácora");
assert(config.includes('href: "/bitacora"') && config.includes('"/bitacora",'), "bitácora en navegación y rutas protegidas");
assert(view.includes("window.print") && view.includes("downloadCsv"), "exportar CSV e imprimir");
assert(!/first_name|last_name/.test(view), "la vista no muestra nombres");

if (failed > 0) process.exit(1);
console.log("verify-screening-log: bitácora por código de sujeto, exportable y sin nombres OK");

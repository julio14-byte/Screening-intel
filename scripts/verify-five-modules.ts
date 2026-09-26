import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRODUCT_MODULE_IDS,
  SCREENING_MODULE_IDS,
} from "../src/lib/product/modules";

const modules = readFileSync(resolve("src/lib/product/modules.ts"), "utf8");
const config = readFileSync(resolve("src/config.ts"), "utf8");
const patients = readFileSync(resolve("src/app/(app)/patients/page.tsx"), "utf8");
const rematch = readFileSync(resolve("src/app/(app)/rematch/page.tsx"), "utf8");
const dashboard = readFileSync(
  resolve("src/components/dashboard/DashboardView.tsx"),
  "utf8"
);
const versionNote = readFileSync(
  resolve("src/components/product/ScreeningVersionNote.tsx"),
  "utf8"
);
const audit = readFileSync(
  resolve("src/components/audit/audit-timeline.tsx"),
  "utf8"
);
const matching = readFileSync(resolve("src/lib/matching.ts"), "utf8");
const funnel = readFileSync(
  resolve("src/components/dashboard/OperationalFunnel.tsx"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(
  SCREENING_MODULE_IDS.join(",") ===
    "registry,profile,matcher,tracker,rematch",
  "cinco módulos de screening"
);
assert(
  PRODUCT_MODULE_IDS.join(",") === SCREENING_MODULE_IDS.join(","),
  "sin módulo Integraciones aparte"
);
assert(!modules.includes('href: "/iwrs"'), "IWRS no es módulo V1");
assert(!modules.includes('label: "EDC"'), "EDC no es módulo V1");
assert(config.includes("Aprovechá mejor los pacientes que YA llegan"), "hero V1");
assert(config.includes("¿Crisvia es una base de datos de pacientes?"), "FAQ no vende DB");
assert(config.includes("Esa cifra no es de Crisvia"), "FAQ TrialGPT no es métrica nuestra");
assert(!config.includes("42,6% de Crisvia"), "no apropia TrialGPT");
assert(patients.includes("no una base de datos para vender"), "registro no se vende como DB");
assert(rematch.includes("no es un paciente perdido"), "re-match = follow-up de SF");
assert(dashboard.includes("ScreeningVersionNote"), "dashboard declara V1");
assert(versionNote.includes("Todavía no"), "huecos explícitos");
assert(versionNote.includes("TrialGPT"), "TrialGPT citado como paper, no como KPI");
assert(audit.includes("no es una certificación"), "21 CFR sin sello");
assert(matching.length > 100, "motor de matching presente");
assert(funnel.includes("Inbox del portal"), "captación ya no es el discurso");

if (failed) process.exit(1);
console.log("verify-five-modules: V1 screening intelligence, sin vender DB ni TrialGPT OK");

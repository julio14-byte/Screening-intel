import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRODUCT_MODULE_IDS,
  SCREENING_MODULE_IDS,
} from "../src/lib/product/modules";

const config = readFileSync(resolve("src/config.ts"), "utf8");
const patients = readFileSync(resolve("src/app/(app)/patients/page.tsx"), "utf8");
const rematch = readFileSync(resolve("src/app/(app)/rematch/page.tsx"), "utf8");
const dashboard = readFileSync(
  resolve("src/components/dashboard/DashboardView.tsx"),
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
const funnelModel = readFileSync(resolve("src/lib/ops/model.ts"), "utf8");

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
assert(config.includes("Aprovechá mejor los pacientes que YA llegan"), "hero comercial");
assert(!config.includes("Versión 1"), "sin etiqueta de prototipo");
assert(!config.includes("Esa cifra no es de Crisvia"), "sin desmentir métricas ajenas en la landing");
assert(!config.includes("42,6%"), "sin cifra de TrialGPT");
assert(!config.includes("base de datos de pacientes"), "sin FAQ defensiva");
assert(!patients.includes("base de datos para vender"), "el registro no se explica");
assert(!rematch.includes("no es un paciente perdido"), "re-match sin texto de producto");
assert(!existsSync(resolve("src/components/screening/ScreeningProcessNote.tsx")), "sin nota de sorteo");
assert(!dashboard.includes("Versión 1"), "dashboard sin banner Versión 1");
assert(!dashboard.includes("ScreeningVersionNote"), "dashboard sin nota de producto");
assert(!dashboard.includes("Notas clínicas"), "dashboard sin notas médicas");
assert(!dashboard.includes("notas médicas"), "dashboard sin notas médicas");
assert(dashboard.includes("OperationalFunnel"), "dashboard muestra el embudo");
assert(dashboard.includes("DashboardKpiCards"), "dashboard muestra KPIs");
assert(!audit.includes("certificación"), "la bitácora no se explica");
assert(!audit.includes("21 CFR"), "sin citar una norma en la pantalla");
assert(matching.length > 100, "motor de matching presente");
assert(funnel.includes("Embudo de screening"), "embudo en dashboard");
assert(funnelModel.includes("Inbox del portal"), "captación ya no es el discurso");
const RETIRED = [
  "src/app/(app)/devices",
  "src/app/(app)/iwrs",
  "src/app/(app)/edc",
  "src/app/(app)/epro",
  "src/app/(app)/cierre",
  "src/app/(app)/agenda",
  "src/app/(app)/integraciones",
  "src/app/(app)/cola",
  "src/app/epro-app",
  "src/app/diario",
  "src/app/api/iwrs",
  "src/app/api/epro-app",
  "src/app/api/cierre",
  "src/lib/iwrs",
  "src/lib/ehr",
];
for (const path of RETIRED) {
  assert(!existsSync(resolve(path)), `módulo retirado no debe existir: ${path}`);
}
for (const route of ["/devices", "/iwrs", "/epro", "/edc", "/cierre"]) {
  assert(!config.includes(`"${route}"`), `config sin ruta ${route}`);
}
const transitions = readFileSync(
  resolve("src/lib/rbac/screening-transitions.ts"),
  "utf8"
);
assert(
  /coordinator:\s*\[[^\]]*randomized/.test(transitions),
  "coordinador puede marcar randomizado"
);

if (failed) process.exit(1);
console.log("verify-five-modules: V1 screening intelligence, sin vender DB ni TrialGPT OK");

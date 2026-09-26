import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_MODULE_IDS } from "../src/lib/product/modules";

const config = readFileSync(resolve("src/config.ts"), "utf8");
const modules = readFileSync(resolve("src/lib/product/modules.ts"), "utf8");
const nav = readFileSync(resolve("src/lib/app/nav.ts"), "utf8");
const permissions = readFileSync(resolve("src/lib/rbac/permissions.ts"), "utf8");
const openapi = readFileSync(resolve("src/lib/openapi/spec.ts"), "utf8");
const edcPage = readFileSync(resolve("src/app/(app)/edc/page.tsx"), "utf8");
const eproPage = readFileSync(resolve("src/app/(app)/epro/page.tsx"), "utf8");
const iwrsPage = readFileSync(resolve("src/app/(app)/iwrs/page.tsx"), "utf8");
const patients = readFileSync(
  resolve("src/app/(app)/patients/[id]/page.tsx"),
  "utf8"
);
const tracker = readFileSync(resolve("src/app/(app)/tracker/page.tsx"), "utf8");
const retired = readFileSync(
  resolve("src/components/integraciones/RetiredThirdPartyModule.tsx"),
  "utf8"
);
const colaPage = readFileSync(resolve("src/app/(app)/cola/page.tsx"), "utf8");
const integracionesPage = readFileSync(
  resolve("src/app/(app)/integraciones/page.tsx"),
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
  PRODUCT_MODULE_IDS.join(",") ===
    "registry,profile,matcher,tracker,rematch",
  "solo cinco módulos de screening"
);
assert(!PRODUCT_MODULE_IDS.includes("integraciones" as typeof PRODUCT_MODULE_IDS[number]), "sin módulo Integraciones");
assert(!config.includes('href: "/integraciones"'), "nav sin Integraciones");
assert(!config.includes('href: "/cola"'), "nav sin Cola");
assert(!config.includes('"/api/integraciones/inbound"'), "inbound ya no es API pública");
assert(!config.includes('"/api/epro-app/p"'), "ePRO móvil ya no es API pública de producto");
assert(!config.includes('"/api/diario/t"'), "diario ya no es API pública de producto");
assert(config.includes("No hay un enchufe único"), "FAQ Lilly honesta");
assert(!config.includes("X-Crisvia-Signature"), "FAQ ya no vende HMAC");
assert(!permissions.includes('"/api/integraciones"'), "WRITE sin integraciones");
assert(!modules.includes('href: "/iwrs"'), "IWRS no es módulo de producto");
assert(!modules.includes('label: "EDC"'), "EDC no es módulo de producto");
assert(nav.includes('NavSection = "screening"'), "nav solo screening");
assert(!openapi.includes('name: "Integraciones"'), "OpenAPI sin tag Integraciones");
assert(!openapi.includes('"/api/integraciones/inbound"'), "OpenAPI sin inbound");
assert(!existsSync(resolve("src/app/api/integraciones/inbound/route.ts")), "API inbound borrada");
assert(!existsSync(resolve("src/lib/integraciones/dispatch.ts")), "dispatch borrado");
assert(!existsSync(resolve("src/components/ops/TaskQueueBoard.tsx")), "tablero de cola borrado");
assert(edcPage.includes("RetiredThirdPartyModule"), "EDC retirado");
assert(eproPage.includes('kind="epro"'), "ePRO retirado");
assert(iwrsPage.includes('kind="iwrs"'), "IWRS retirado");
assert(!retired.includes("/integraciones"), "retirados no apuntan a Integraciones");
assert(!patients.includes("PatientEproInviteCard"), "expediente sin invitación ePRO");
assert(!patients.includes("PatientFollowUpCard"), "expediente sin seguimiento EDC");
assert(!tracker.includes("/api/integraciones"), "tracker sin fetch de IWRS webhook");
assert(colaPage.includes('redirect("/avisos")'), "cola redirige a avisos");
assert(integracionesPage.includes('redirect("/tracker")'), "integraciones redirige a tracker");

if (failed) process.exit(1);
console.log(
  "verify-integraciones: sin módulo de conectores ni cola; EDC/ePRO/IWRS siguen en el tercero OK"
);

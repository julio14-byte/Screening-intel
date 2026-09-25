import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bearerMatches,
  eventForStatus,
  isAllowedWebhookUrl,
  isIntegrationKind,
  kindsForEvent,
  signPayload,
  signatureMatches,
} from "../src/lib/integraciones/model";

const sql = readFileSync(
  resolve("supabase/migrations/20260925050000_protocol_integrations.sql"),
  "utf8"
);
const config = readFileSync(resolve("src/config.ts"), "utf8");
const permissions = readFileSync(resolve("src/lib/rbac/permissions.ts"), "utf8");
const modules = readFileSync(resolve("src/lib/product/modules.ts"), "utf8");
const nav = readFileSync(resolve("src/lib/app/nav.ts"), "utf8");
const openapi = readFileSync(resolve("src/lib/openapi/spec.ts"), "utf8");
const inbound = readFileSync(
  resolve("src/app/api/integraciones/inbound/route.ts"),
  "utf8"
);
const dispatch = readFileSync(resolve("src/lib/integraciones/dispatch.ts"), "utf8");
const edcPage = readFileSync(resolve("src/app/(app)/edc/page.tsx"), "utf8");
const eproPage = readFileSync(resolve("src/app/(app)/epro/page.tsx"), "utf8");
const iwrsPage = readFileSync(resolve("src/app/(app)/iwrs/page.tsx"), "utf8");
const patients = readFileSync(
  resolve("src/app/(app)/patients/[id]/page.tsx"),
  "utf8"
);
const tracker = readFileSync(resolve("src/app/(app)/tracker/page.tsx"), "utf8");

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("protocol_integrations"), "tabla conexiones");
assert(sql.includes("integration_deliveries"), "tabla entregas");
assert(sql.includes("screening_external_ids"), "ids externos");
assert(sql.includes("kind in ('edc', 'epro', 'iwrs')"), "kinds");
assert(sql.includes("enable row level security"), "RLS");
assert(!/grant delete/i.test(sql), "sin DELETE");
assert(sql.includes("revoke all on table public.protocol_integrations from anon, public"), "sin GRANT anon");
assert(sql.includes("revoke select (signing_secret)"), "secreto no se lista");
assert(sql.includes("length(signing_secret) >= 16"), "secreto mínimo");

assert(eventForStatus("screening") === "screening.eligible", "elegible");
assert(eventForStatus("screen_failure") === "screening.screen_failure", "screen failure");
assert(eventForStatus("randomized") === "screening.randomized", "randomizado");
assert(eventForStatus("pre_screening") === null, "pre-screening no dispara");
assert(kindsForEvent("screening.eligible").join(",") === "edc,epro,iwrs", "elegible a los tres");
assert(kindsForEvent("screening.screen_failure").join(",") === "edc,iwrs", "SF a EDC+IWRS");
assert(kindsForEvent("screening.randomized").join(",") === "edc,epro", "randomizado a EDC+ePRO");
assert(isIntegrationKind("edc") && isIntegrationKind("iwrs"), "kinds válidos");
assert(!isIntegrationKind("lilly"), "no hay kind Lilly");
assert(isAllowedWebhookUrl("https://vendor.example/hook"), "https ok");
assert(isAllowedWebhookUrl("http://localhost:3001/hook"), "localhost ok");
assert(!isAllowedWebhookUrl("http://evil.example/hook"), "http remoto no");

const raw = JSON.stringify({ event: "screening.eligible", subject_code: "10001" });
const signature = signPayload("super-secret-value-16", raw);
assert(signature.startsWith("sha256="), "prefijo hmac");
assert(signatureMatches("super-secret-value-16", raw, signature), "firma verifica");
assert(!signatureMatches("super-secret-value-16", raw, "sha256=deadbeef"), "firma mala");
assert(bearerMatches("super-secret-value-16", "Bearer super-secret-value-16"), "bearer ok");
assert(!bearerMatches("super-secret-value-16", "Bearer other-secret-value-16"), "bearer malo");

assert(config.includes('href: "/integraciones"'), "nav integraciones");
assert(config.includes('"/api/integraciones/inbound"'), "inbound público");
assert(!config.includes('"/api/epro-app/p"'), "ePRO móvil ya no es API pública de producto");
assert(!config.includes('"/api/diario/t"'), "diario ya no es API pública de producto");
assert(config.includes("No hay un enchufe único"), "FAQ Lilly honesta");
assert(config.includes("X-Crisvia-Signature"), "FAQ firma");
assert(permissions.includes('"/api/integraciones"'), "WRITE integraciones");
assert(permissions.includes("isWriteApiPath"), "inbound excluido del bloqueo monitor");
assert(modules.includes('PRODUCT_MODULE_IDS = ["screening", "integraciones"]'), "solo dos módulos");
assert(!modules.includes('href: "/iwrs"'), "IWRS no es módulo de producto");
assert(!modules.includes('label: "EDC"'), "EDC no es módulo de producto");
assert(nav.includes('NavSection = "screening" | "integraciones"'), "secciones nav");
assert(openapi.includes('name: "Integraciones"'), "OpenAPI tag");
assert(openapi.includes('"/api/integraciones/inbound"'), "OpenAPI inbound");
assert(inbound.includes("iwrs.randomized"), "IWRS inbound");
assert(inbound.includes("signatureMatches"), "HMAC inbound");
assert(dispatch.includes("subject_code"), "outbound con código");
assert(!dispatch.includes("first_name"), "outbound sin nombre");
assert(!dispatch.includes("birth_date"), "outbound sin fecha de nacimiento");
assert(edcPage.includes("RetiredThirdPartyModule"), "EDC retirado");
assert(eproPage.includes('kind="epro"'), "ePRO retirado");
assert(iwrsPage.includes('kind="iwrs"'), "IWRS retirado");
assert(!patients.includes("PatientEproInviteCard"), "expediente sin invitación ePRO");
assert(!patients.includes("PatientFollowUpCard"), "expediente sin seguimiento EDC");
assert(tracker.includes("La randomización llega por webhook"), "tracker respeta IWRS tercero");

if (failed) process.exit(1);
console.log(
  "verify-integraciones: screening + webhooks HMAC a EDC/ePRO/IWRS de terceros OK"
);

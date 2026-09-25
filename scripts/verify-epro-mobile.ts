import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EPRO_IDLE_MS,
  EPRO_INVITE_MS,
  EPRO_PIN_LENGTH,
  hashOpaqueToken,
  hashPin,
  isMissingEproMobileSchema,
  isSixDigitPin,
  newOpaqueToken,
  utcToday,
  verifyPin,
} from "../src/lib/epro-app/crypto";
import { sanitizeAnswerValue } from "../src/lib/epro-app/sanitize";
import { canSendEproInvite } from "../src/lib/rbac/types";

const sql = readFileSync(
  resolve("supabase/migrations/20260925020000_epro_mobile_patient.sql"),
  "utf8"
);
const config = readFileSync(resolve("src/config.ts"), "utf8");
const permissions = readFileSync(resolve("src/lib/rbac/permissions.ts"), "utf8");
const hoy = readFileSync(resolve("src/app/api/epro-app/p/hoy/route.ts"), "utf8");
const activar = readFileSync(resolve("src/app/api/epro-app/p/activar/route.ts"), "utf8");
const pageHoy = readFileSync(resolve("src/app/epro-app/page.tsx"), "utf8");
const inviteApi = readFileSync(
  resolve("src/app/api/epro-app/invite/route.ts"),
  "utf8"
);
const inviteUi = readFileSync(
  resolve("src/components/epro/PatientEproInviteCard.tsx"),
  "utf8"
);

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(sql.includes("epro_activation_invites"), "tabla de invitaciones");
assert(sql.includes("epro_patient_pins"), "tabla de PIN");
assert(sql.includes("epro_patient_sessions"), "tabla de sesiones");
assert(sql.includes("epro_daily_answers"), "tabla de respuestas diarias");
assert(sql.includes("epro_questions"), "vista Preguntas");
assert(sql.includes("cadence"), "cadencia visita|diario");
assert(sql.includes("'visit', 'daily'"), "valores de cadencia");
assert(sql.includes("unique (patient_id, form_id, answered_on)"), "una respuesta por día");
assert(sql.includes("epro_daily_answers_immutable"), "trigger inmutable");
assert(sql.includes("length(token_hash) = 64"), "hash SHA-256 en hex");
assert(sql.includes("can_write_clinical_data()"), "coordinador/PI invita");
assert(sql.includes("enable row level security"), "RLS");
assert(
  sql.includes("revoke all on table public.epro_patient_pins from anon, public, authenticated"),
  "PIN hash sin GRANT a authenticated"
);
assert(
  sql.includes(
    "revoke all on table public.epro_patient_sessions from anon, public, authenticated"
  ),
  "sesiones sin GRANT a authenticated"
);
assert(!/grant delete/i.test(sql), "sin DELETE autenticado");
assert(sql.includes("epro_activation_status"), "RPC de estado sin pin_hash");
assert(sql.includes("timezone('utc', now())"), "submitted_at UTC");

assert(EPRO_IDLE_MS === 3 * 60 * 1000, "idle 3 minutos");
assert(EPRO_INVITE_MS === 48 * 60 * 60 * 1000, "invitación 48 h");
assert(EPRO_PIN_LENGTH === 6, "PIN de 6 dígitos");
assert(isSixDigitPin("123456"), "PIN válido");
assert(!isSixDigitPin("12345"), "PIN corto inválido");
assert(!isSixDigitPin("12345a"), "PIN no numérico inválido");

const token = newOpaqueToken();
assert(token.length >= 24, "token largo");
assert(!/[+/=]/.test(token), "token URL-safe");
assert(hashOpaqueToken(token).length === 64, "hash 64 hex");
assert(hashOpaqueToken(token) === hashOpaqueToken(token), "hash determinista");

assert(utcToday().length === 10, "día UTC ISO");
assert(sanitizeAnswerValue("<b>ok</b>") === "ok", "sanitiza HTML");
assert(
  isMissingEproMobileSchema(
    "Could not find the table 'public.epro_daily_answers' in the schema cache"
  ),
  "detecta schema ePRO faltante"
);
assert(
  !isMissingEproMobileSchema("duplicate key value violates unique constraint"),
  "no confunde unique con schema faltante"
);

assert(config.includes('"/api/epro-app/p"'), "API pública acotada a /api/epro-app/p");
assert(!config.includes('"/api/epro-app",'), "invite y respuestas no son APIs públicas");
assert(config.includes('eproApp: "/epro-app"'), "ruta canónica ePRO móvil");
assert(config.includes("no es una certificación"), "FAQ: diseño, no certificación");
assert(permissions.includes('"/api/epro-app/invite"'), "WRITE solo invite staff");
assert(!permissions.includes('"/api/epro-app",'), "WRITE no cubre /api/epro-app entero");
assert(hoy.includes("recordEproMobileAudit"), "POST diario escribe bitácora");
assert(hoy.includes('action: "INSERT"'), "audit action INSERT");
assert(hoy.includes("subjectCode"), "audit con código de sujeto");
assert(hoy.includes("sanitizeAnswerValue"), "respuestas sanitizadas");
assert(hoy.includes("clinicIdOf"), "formulario diario filtrado por centro");
assert(activar.includes("birth_year"), "activación con año de nacimiento");
assert(activar.includes("hashPin"), "PIN hasheado al activar");
assert(pageHoy.includes("Cuestionario completado por hoy"), "pantalla de completado");
assert(pageHoy.includes("SubjectBadge"), "UI con código de sujeto");
assert(!pageHoy.includes("first_name"), "UI móvil sin first_name");
assert(!pageHoy.includes("phone"), "UI móvil sin teléfono");
assert(inviteUi.includes("Invitar al ePRO móvil (coordinador)"), "botón de invitación del coordinador");
assert(inviteUi.includes("canSendEproInvite"), "UI usa canSendEproInvite");
assert(inviteApi.includes("canSendEproInvite"), "API exige rol de invitación");
assert(canSendEproInvite("coordinator"), "coordinador invita");
assert(canSendEproInvite("investigator"), "PI también puede invitar");
assert(!canSendEproInvite("monitor"), "monitor no invita");

async function main() {
  const pinHash = await hashPin("482917");
  assert(pinHash.startsWith("scrypt$"), "PIN con scrypt");
  assert(await verifyPin("482917", pinHash), "PIN verifica");
  assert(!(await verifyPin("000000", pinHash)), "PIN incorrecto no verifica");

  if (failed) process.exit(1);
  console.log("verify-epro-mobile: invitación, PIN scrypt, diario UTC e idle 3 min OK");
}

void main();

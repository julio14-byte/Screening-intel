import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildContactStatus,
  contactAttemptSchema,
  summarizeContact,
  type ContactAttempt,
  type ContactOutcome,
} from "../src/lib/candidato/contact-log";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const now = new Date(2026, 2, 10, 12, 0, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const S = "11111111-1111-4111-8111-111111111111";

let n = 0;
const attempt = (
  outcome: ContactOutcome,
  hAgo: number,
  next: string | null = null
): ContactAttempt => ({
  id: `a${++n}`,
  submission_id: S,
  channel: "phone",
  outcome,
  notes: null,
  next_attempt_on: next,
  attempted_at: hoursAgo(hAgo),
});

assert(buildContactStatus(hoursAgo(5), [], now).state === "new", "menos de 24 h sin contacto es nuevo");
assert(buildContactStatus(hoursAgo(30), [], now).state === "due_soon", "24–48 h pide contactar hoy");
const overdue = buildContactStatus(hoursAgo(49), [], now);
assert(overdue.state === "overdue" && overdue.hoursWithoutContact === 49, "más de 48 h sin ningún intento está vencido");
assert(buildContactStatus(hoursAgo(200), [attempt("reached", 1)], now).state === "closed", "contactado cierra el ciclo");
assert(buildContactStatus(hoursAgo(200), [attempt("declined", 1)], now).state === "closed", "no le interesa cierra el ciclo");
assert(buildContactStatus(hoursAgo(200), [attempt("scheduled", 1)], now).state === "closed", "cita agendada cierra el ciclo");
assert(buildContactStatus(hoursAgo(200), [attempt("wrong_number", 1)], now).state === "closed", "número equivocado cierra el ciclo");

const retryPast = buildContactStatus(hoursAgo(100), [attempt("no_answer", 30, "2026-03-09")], now);
assert(retryPast.state === "follow_up_due", "reintento con fecha pasada está pendiente");
const retryToday = buildContactStatus(hoursAgo(100), [attempt("voicemail", 30, "2026-03-10")], now);
assert(retryToday.state === "follow_up_due", "reintento para hoy está pendiente");
const retryFuture = buildContactStatus(hoursAgo(100), [attempt("no_answer", 30, "2026-03-12")], now);
assert(retryFuture.state === "waiting", "reintento futuro queda programado");
assert(buildContactStatus(hoursAgo(100), [attempt("no_answer", 30)], now).state === "follow_up_due", "sin fecha de reintento sigue pendiente");

const three = buildContactStatus(
  hoursAgo(300),
  [attempt("no_answer", 90), attempt("voicemail", 60), attempt("no_answer", 30, "2026-03-20")],
  now
);
assert(three.state === "unreachable" && three.attempts === 3, "tres intentos sin respuesta marcan inalcanzable");
const reachedAfter = buildContactStatus(
  hoursAgo(300),
  [attempt("no_answer", 90), attempt("no_answer", 60), attempt("reached", 30)],
  now
);
assert(reachedAfter.state === "closed", "el último resultado manda: si ya se habló, está cerrado");
assert(buildContactStatus(hoursAgo(300), [attempt("no_answer", 5), attempt("reached", 90)], now).state === "follow_up_due", "ordena por fecha y no por posición");

const urgent = [overdue, retryPast, retryFuture, buildContactStatus(hoursAgo(5), [], now)]
  .sort((a, b) => b.urgency - a.urgency)
  .map((s) => s.state);
assert(urgent.join() === "overdue,follow_up_due,new,waiting", "orden de urgencia en la bandeja");
const summary = summarizeContact([overdue, retryPast, three]);
assert(summary.overdue === 1 && summary.followUpDue === 1 && summary.unreachable === 1, "resumen de alertas");

const ok = { submission_id: S, channel: "whatsapp", outcome: "reached", notes: "Prefiere tardes", next_attempt_on: null };
assert(contactAttemptSchema.safeParse(ok).success, "intento válido");
assert(!contactAttemptSchema.safeParse({ ...ok, channel: "carta" }).success, "rechaza canal desconocido");
assert(!contactAttemptSchema.safeParse({ ...ok, outcome: "x" }).success, "rechaza resultado desconocido");
assert(!contactAttemptSchema.safeParse({ ...ok, notes: "a".repeat(501) }).success, "limita notas a 500");
assert(!contactAttemptSchema.safeParse({ ...ok, next_attempt_on: "2026-99-99" }).success, "rechaza fecha inexistente");
assert(!contactAttemptSchema.safeParse({ ...ok, submission_id: "no" }).success, "rechaza candidato inválido");

const migration = read("supabase/migrations/20261021090000_candidate_contact_log.sql");
assert(/enable row level security/.test(migration), "migración con RLS");
assert(!/grant[^;]*(update|delete)[^;]*candidate_contact_attempts/i.test(migration), "bitácora de solo agregar: sin update ni delete");
assert(/revoke all on table public\.candidate_contact_attempts from anon/.test(migration), "anon sin acceso");
assert(/can_write_clinical_data/.test(migration), "solo roles clínicos registran contactos");
const inbox = read("src/components/candidatos/CandidatosInbox.tsx");
assert(inbox.includes("ContactLogPanel") && inbox.includes("buildContactStatus"), "bandeja muestra estado y bitácora");
assert(inbox.includes("isReadOnly"), "monitor no registra contactos");
assert(read("src/lib/rbac/permissions.ts").includes('"/api/candidatos"'), "monitor bloqueado al escribir contactos");

if (failed > 0) process.exit(1);
console.log("verify-contact-log: SLA de 48 h, reintentos y bitácora de solo agregar OK");

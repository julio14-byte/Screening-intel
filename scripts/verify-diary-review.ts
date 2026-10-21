import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  compliancePct,
  diaryFlags,
  diaryInputSchema,
  latestByVisit,
  suggestPeriod,
  summarizeDiaryReviews,
  visitsPendingDiaryReview,
  type DiaryReview,
} from "../src/lib/diary/review";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const P = "11111111-1111-4111-8111-111111111111";
const PR = "22222222-2222-4222-8222-222222222222";
const V = "33333333-3333-4333-8333-333333333333";

const base = {
  patient_id: P,
  protocol_id: PR,
  visit_id: V,
  source_system: "veeva",
  source_ref: "Sujeto 1042 · semana 4",
  period_start: "2026-03-01",
  period_end: "2026-03-28",
  expected_days: 28,
  completed_days: 25,
};

assert(diaryInputSchema.safeParse(base).success, "acepta una revisión completa");
assert(!diaryInputSchema.safeParse({ ...base, source_ref: " " }).success, "exige la referencia de la fuente");
assert(!diaryInputSchema.safeParse({ ...base, source_system: "excel" }).success, "rechaza sistemas desconocidos");
assert(!diaryInputSchema.safeParse({ ...base, period_end: "2026-02-28" }).success, "rechaza fin anterior al inicio");
assert(!diaryInputSchema.safeParse({ ...base, expected_days: 40 }).success, "no se esperan más días que los del periodo");
assert(!diaryInputSchema.safeParse({ ...base, completed_days: 29 }).success, "completados no superan esperados");
assert(!diaryInputSchema.safeParse({ ...base, possible_ae: true }).success, "un posible EA exige descripción");
assert(diaryInputSchema.safeParse({ ...base, possible_ae: true, ae_note: "Mareo leve dos días" }).success, "posible EA con descripción");
assert(!diaryInputSchema.safeParse({ ...base, new_medications: true }).success, "medicación nueva exige detalle");

const review = (patch: Partial<DiaryReview> = {}): DiaryReview => ({
  id: "r1",
  patient_id: P,
  protocol_id: PR,
  visit_id: V,
  source_system: "veeva",
  source_ref: "Sujeto 1042",
  period_start: "2026-03-01",
  period_end: "2026-03-28",
  expected_days: 28,
  completed_days: 28,
  missed_doses: 0,
  possible_ae: false,
  ae_note: null,
  new_medications: false,
  new_medications_note: null,
  note: null,
  reviewer_role: "coordinator",
  reviewed_at: "2026-03-28T10:00:00Z",
  ...patch,
});

assert(compliancePct(review({ completed_days: 21 })) === 75, "cumplimiento = completados / esperados");
assert(diaryFlags(review()).length === 0, "diario completo sin señales");
assert(diaryFlags(review({ completed_days: 21 })).some((f) => f.kind === "low_compliance"), "cumplimiento < 80% se señala");
assert(diaryFlags(review({ completed_days: 23 })).every((f) => f.kind !== "low_compliance"), "82% no se señala");
assert(diaryFlags(review({ missed_doses: 2 })).some((f) => f.kind === "missed_doses"), "dosis omitidas se señalan");
assert(
  diaryFlags(review({ possible_ae: true, ae_note: "Mareo" }), { id: V, status: "completed", actual_on: "2026-03-28", adverse_event: false })
    .some((f) => f.kind === "ae_unrecorded"),
  "posible EA que la visita no registra se señala"
);
assert(
  diaryFlags(review({ possible_ae: true, ae_note: "Mareo" }), { id: V, status: "completed", actual_on: "2026-03-28", adverse_event: true })
    .some((f) => f.kind === "ae_open"),
  "posible EA ya registrado queda para el investigador"
);
assert(diaryFlags(review({ new_medications: true, new_medications_note: "Ibuprofeno" })).some((f) => f.kind === "new_medications"), "medicación nueva se señala");

const visits = [
  { id: "a", status: "completed", actual_on: "2026-02-01", adverse_event: false, baseline_on: "2026-01-04" },
  { id: V, status: "completed", actual_on: "2026-03-01", adverse_event: false, baseline_on: "2026-01-04" },
  { id: "c", status: "scheduled", actual_on: null, adverse_event: false, baseline_on: "2026-01-04" },
  { id: "d", status: "out_of_window", actual_on: "2026-04-01", adverse_event: false, baseline_on: "2026-01-04" },
];
const reviews = [review({ visit_id: V }), review({ id: "r0", visit_id: V, reviewed_at: "2026-03-01T08:00:00Z" })];
assert(latestByVisit(reviews).get(V)?.id === "r1", "la revisión más reciente de la visita prevalece");
assert(
  visitsPendingDiaryReview(visits, reviews).map((v) => v.id).join() === "a,d",
  "pendientes: visitas realizadas sin revisión de diario (no las programadas)"
);
assert(JSON.stringify(suggestPeriod(visits, V)) === JSON.stringify({ start: "2026-02-02", end: "2026-03-01" }), "periodo sugerido desde el día siguiente a la visita previa");
assert(JSON.stringify(suggestPeriod(visits, "a")) === JSON.stringify({ start: "2026-01-04", end: "2026-02-01" }), "primera visita: desde el día 0");
assert(suggestPeriod(visits, "c") === null, "sin visita realizada no hay periodo");

const summary = summarizeDiaryReviews([review(), review({ id: "r2", completed_days: 14, possible_ae: true, ae_note: "x" })]);
assert(summary.total === 2 && summary.avgCompliancePct === 75 && summary.withFlags === 1 && summary.pendingAe === 1, "resumen de revisiones");

const migration = read("supabase/migrations/20261021120000_diary_review.sql");
assert(/enable row level security/.test(migration), "RLS activo");
assert(/revoke all on table public\.diary_reviews from anon/.test(migration), "anon sin acceso");
assert(!/grant[^;]*(update|delete)[^;]*diary_reviews/i.test(migration), "revisiones de diario de solo agregar");
assert(/reviewer_role[^\n]*get_user_app_role/.test(migration), "el rol del revisor lo fija la BD");
assert(/diary_reviews_days_check/.test(migration), "coherencia de días validada en BD");
assert(/v\.protocol_id = diary_reviews\.protocol_id/.test(migration), "la visita debe coincidir con paciente y protocolo");
assert(read("src/lib/rbac/permissions.ts").includes('"/api/diary-review"'), "monitor bloqueado en escrituras del diario");
assert(read("src/components/follow-up/DiaryReviewPanel.tsx").includes("El diario vive en el sistema del patrocinador"), "la UI aclara que Crisvia no es el sistema fuente");
assert(!/diary_entries|ediary_entries|diary_answers/.test(migration), "no se copian las entradas del diario");

if (failed > 0) process.exit(1);
console.log("verify-diary-review: revisión de diario con fuente, señales y bitácora de solo agregar OK");

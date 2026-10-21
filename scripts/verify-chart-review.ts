import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluatePatientAgainstProtocol } from "../src/lib/matching";
import {
  buildReviewRows,
  engineNumber,
  reviewInputSchema,
  reviewSheetToCsv,
  summarizeReview,
  valueMismatch,
  type CriterionReview,
} from "../src/lib/chart-review/review";
import {
  medicationInputSchema,
  reconcileMedications,
  type StructuredMedication,
} from "../src/lib/chart-review/medications";
import { emptySiteProfile } from "../src/lib/site/profile";
import type { ClinicalProfile, Patient, Protocol } from "../src/lib/types";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const today = new Date(2026, 2, 10, 12);
const P = "11111111-1111-4111-8111-111111111111";
const PR = "22222222-2222-4222-8222-222222222222";

const patient = {
  id: P,
  clinic_id: "c1",
  first_name: "Ana",
  last_name: "Soto",
  birth_date: "1975-05-01",
  gender: "female",
  created_at: "2026-01-01T00:00:00Z",
  subject_code: "100001",
} as Patient;
const profile = {
  id: "pf1",
  patient_id: P,
  conditions: ["Diabetes mellitus tipo 2"],
  medications: ["Metformina", "Insulina glargina"],
  laboratories: { hba1c: 8.2 },
  updated_at: "2026-03-01T00:00:00Z",
} as ClinicalProfile;
const protocol = {
  id: PR,
  clinic_id: "c1",
  title: "Estudio DM2",
  code_name: "DM2-01",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  inclusion_criteria: {
    min_age: 18,
    max_age: 70,
    required_conditions: ["diabetes"],
    required_labs: [{ name: "hba1c", min: 7, max: 10, unit: "%", max_age_days: 30 }],
  },
  exclusion_criteria: { excluded_medications: ["insulina"], washout_days: 14 },
} as Protocol;

const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
const labDetail = result.details.find((d) => d.criterion.startsWith("Lab hba1c"))!;
assert(labDetail.status === "pass" && engineNumber(labDetail.evidence ?? []) === 8.2, "el motor cita el valor de HbA1c");

let n = 0;
const review = (
  criterion: string,
  over: Partial<CriterionReview> = {}
): CriterionReview => {
  const detail = result.details.find((d) => d.criterion === criterion)!;
  return {
    id: `r${++n}`,
    patient_id: P,
    protocol_id: PR,
    criterion,
    criterion_type: detail.type,
    engine_status: detail.status,
    engine_evidence: detail.evidence ?? [],
    decision: "confirmed",
    source_type: "lab_report",
    source_ref: "Folio 123",
    observed_on: "2026-03-05",
    source_value: null,
    note: null,
    reviewer_role: "coordinator",
    reviewed_at: `2026-03-0${Math.min(n, 9)}T10:00:00Z`,
    ...over,
  };
};

const rowsEmpty = buildReviewRows(result.details, [], protocol, today);
assert(rowsEmpty.every((r) => r.state === "unreviewed"), "sin revisiones todo queda sin revisar");
assert(!summarizeReview(rowsEmpty).readyForInvestigator, "sin revisar no está listo");

assert(valueMismatch(["hba1c: 8.2 %"], "8,2") === false, "8,2 coincide con 8.2");
assert(valueMismatch(["hba1c: 8.2 %"], "9.1 %") === true, "9.1 contradice 8.2");
assert(valueMismatch(["hba1c: 8.2"], "pendiente") === null, "valor no numérico no se compara");
assert(valueMismatch([], "8.2") === null, "sin valor del sistema no se compara");

const all = result.details.map((d) => review(d.criterion));
const okRows = buildReviewRows(result.details, all, protocol, today);
assert(okRows.every((r) => r.state === "confirmed"), "todo confirmado con fuente vigente");
assert(summarizeReview(okRows).readyForInvestigator, "todo confirmado queda listo para el investigador");

const stale = buildReviewRows(
  result.details,
  all.map((r) => (r.criterion.startsWith("Lab hba1c") ? { ...r, observed_on: "2026-01-01" } : r)),
  protocol,
  today
);
assert(stale.find((r) => r.detail.criterion.startsWith("Lab"))?.state === "stale", "laboratorio con más de 30 días queda fuera de vigencia");
assert(!summarizeReview(stale).readyForInvestigator, "dato fuera de vigencia bloquea el cierre");

const mismatch = buildReviewRows(
  result.details,
  all.map((r) => (r.criterion.startsWith("Lab hba1c") ? { ...r, source_value: "6.1" } : r)),
  protocol,
  today
);
const mismatchRow = mismatch.find((r) => r.detail.criterion.startsWith("Lab"))!;
assert(mismatchRow.state === "discrepancy" && /6.1/.test(mismatchRow.flag ?? ""), "valor distinto en la fuente es discrepancia");
assert(summarizeReview(mismatch).discrepancies === 1, "cuenta discrepancias");

const rejected = buildReviewRows(
  result.details,
  all.map((r) => (r.criterion.startsWith("Diagnóstico") ? { ...r, decision: "rejected" as const } : r)),
  protocol,
  today
);
assert(rejected.find((r) => r.detail.criterion.startsWith("Diagnóstico"))?.state === "rejected", "rechazo de la fuente");

const outdated = buildReviewRows(
  result.details,
  all.map((r) => (r.criterion.startsWith("Lab hba1c") ? { ...r, engine_status: "missing" as const } : r)),
  protocol,
  today
);
assert(outdated.find((r) => r.detail.criterion.startsWith("Lab"))?.state === "outdated", "si el motor cambió, la revisión queda desactualizada");

const reReview = buildReviewRows(
  result.details,
  [
    review("Edad 18 a 70 años", { decision: "clarify", source_type: null, source_ref: null, observed_on: null, note: "Falta identificación" }),
    review("Edad 18 a 70 años", { reviewed_at: "2026-03-09T10:00:00Z" }),
  ],
  protocol,
  today
);
const ageRow = reReview.find((r) => r.detail.criterion.startsWith("Edad"))!;
assert(ageRow.state === "confirmed" && ageRow.reviewCount === 2, "la última revisión manda y se conserva el historial");

assert(!reviewInputSchema.safeParse({ patient_id: P, protocol_id: PR, criterion: "x", criterion_type: "inclusion", engine_status: "pass", decision: "confirmed" }).success, "confirmar exige fuente, referencia y fecha");
assert(!reviewInputSchema.safeParse({ patient_id: P, protocol_id: PR, criterion: "x", criterion_type: "inclusion", engine_status: "pass", decision: "clarify" }).success, "aclaración exige nota");
assert(reviewInputSchema.safeParse({ patient_id: P, protocol_id: PR, criterion: "x", criterion_type: "inclusion", engine_status: "missing", decision: "clarify", note: "Falta el informe" }).success, "aclaración con nota es válida");
assert(reviewInputSchema.safeParse({ patient_id: P, protocol_id: PR, criterion: "x", criterion_type: "inclusion", engine_status: "pass", decision: "confirmed", source_type: "visit_note", source_ref: "Nota 05/03", observed_on: "2026-03-05" }).success, "confirmación con trazabilidad es válida");

const csv = reviewSheetToCsv(
  okRows.map((r, i) => (i === 0 ? { ...r, review: { ...r.review!, source_ref: "=cmd" } } : r)),
  { subjectCode: "100001", protocolCode: "DM2-01" },
  { ...emptySiteProfile(), site_name: "Centro Reforma", pi_name: "Dra. Soto" },
  new Date("2026-03-10T00:00:00Z")
);
assert(csv.startsWith("Hoja de revisión de expediente,Centro Reforma"), "CSV con encabezado del sitio");
assert(csv.includes("Sujeto,100001") && !/Ana|Soto,/.test(csv.split("criterio,tipo")[1] ?? ""), "CSV identifica por código, sin nombre del paciente");
assert(csv.includes("'=cmd"), "CSV neutraliza fórmulas");
assert(csv.includes("Folio 123") && csv.includes("2026-03-05"), "CSV con fuente y fecha del dato");

const med = (name: string, over: Partial<StructuredMedication> = {}): StructuredMedication => ({
  id: name,
  patient_id: P,
  drug_name: name,
  dose: null,
  started_on: "2025-01-01",
  ended_on: null,
  source_type: "patient_interview",
  source_ref: null,
  verified_on: "2026-03-01",
  ...over,
});

const none = reconcileMedications([], ["Metformina"], ["insulina"], 14, today);
assert(none.checks[0].state === "unverified" && !none.hasReconciledList, "sin medicación conciliada no se puede descartar el conflicto");

const blocked = reconcileMedications([med("Insulina glargina")], ["Metformina"], ["insulina"], 14, today);
assert(blocked.checks[0].state === "blocked", "medicamento excluyente vigente bloquea");

const washout = reconcileMedications([med("Insulina glargina", { ended_on: "2026-03-01" })], [], ["insulina"], 14, today);
assert(washout.checks[0].state === "washout" && washout.checks[0].clearOn === "2026-03-15" && washout.checks[0].daysLeft === 5, "lavado: cumple el 15 de marzo, faltan 5 días");

const cleared = reconcileMedications([med("Insulina glargina", { ended_on: "2026-02-01" })], [], ["insulina"], 14, today);
assert(cleared.checks[0].state === "clear", "lavado cumplido");

const noWashout = reconcileMedications([med("Insulina glargina", { ended_on: "2026-03-09" })], [], ["insulina"], null, today);
assert(noWashout.checks[0].state === "clear", "sin lavado en el protocolo, suspendido ya no bloquea");

const lastDay = reconcileMedications([med("Insulina glargina", { ended_on: "2026-03-10" })], [], ["insulina"], 14, today);
assert(lastDay.checks[0].state === "blocked", "el día de fin aún cuenta como vigente");

const other = reconcileMedications([med("Metformina")], ["Metformina"], ["insulina"], 14, today);
assert(other.checks[0].state === "clear", "lista conciliada sin el excluyente queda sin conflicto");

const diff = reconcileMedications([med("Metformina"), med("Losartán")], ["Metformina", "Atorvastatina"], [], null, today);
assert(
  diff.discrepancies.some((d) => d.kind === "profile_only" && d.drug === "Atorvastatina") &&
    diff.discrepancies.some((d) => d.kind === "reconciled_only" && d.drug === "Losartán"),
  "diferencias entre perfil y lista conciliada"
);

const verify = reconcileMedications([med("Metformina", { verified_on: "2026-01-01" }), med("Losartán", { verified_on: null }), med("Ibuprofeno", { verified_on: "2026-03-05" })], [], [], null, today);
assert(verify.needsVerification.map((m) => m.drug_name).sort().join() === "Losartán,Metformina", "verificación vencida (>30 días) o ausente");

assert(!medicationInputSchema.safeParse({ patient_id: P, drug_name: "x", source_type: "other" }).success, "rechaza nombre demasiado corto");
assert(!medicationInputSchema.safeParse({ patient_id: P, drug_name: "Metformina", source_type: "other", started_on: "2026-03-02", ended_on: "2026-03-01" }).success, "rechaza fin anterior al inicio");

const migration = read("supabase/migrations/20261021110000_chart_review.sql");
assert((migration.match(/enable row level security/g) ?? []).length === 2, "RLS en ambas tablas");
assert(/criterion_reviews_traceable_check/.test(migration), "decisión firme exige fuente, referencia y fecha en BD");
assert(/reviewer_role[^\n]*get_user_app_role/.test(migration), "el rol del revisor lo fija la BD");
assert(!/grant[^;]*(update|delete)[^;]*criterion_reviews/i.test(migration), "revisiones de solo agregar");
assert(/revoke all on table public\.criterion_reviews from anon/.test(migration), "anon sin acceso");
assert(read("src/lib/rbac/permissions.ts").includes('"/api/chart-review"'), "monitor bloqueado en escrituras de revisión");
assert(read("src/components/protocols/MatchResultsTable.tsx").includes("/revision/"), "acceso a la revisión desde el matching");
assert(read("src/components/chart-review/ChartReviewView.tsx").includes("decisión de elegibilidad es del investigador"), "la decisión final queda al investigador");

if (failed > 0) process.exit(1);
console.log("verify-chart-review: evidencia con fuente, revisión por criterio y conciliación con lavado OK");

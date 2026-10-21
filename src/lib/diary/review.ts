import { z } from "zod";
import { addUtcDays } from "@/lib/follow-up/model";

export const DIARY_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021120000_diary_review.sql en Supabase.";

export const DIARY_SOURCES = ["veeva", "clinical_ink", "other_ediary", "paper_diary"] as const;
export type DiarySource = (typeof DIARY_SOURCES)[number];

export const DIARY_SOURCE_LABELS: Record<DiarySource, string> = {
  veeva: "Veeva (diario del patrocinador)",
  clinical_ink: "Clinical Ink (diario / eSource del patrocinador)",
  other_ediary: "Otro diario electrónico",
  paper_diary: "Diario en papel",
};

/** Por debajo de este cumplimiento se pide atención del investigador. */
export const LOW_COMPLIANCE_PCT = 80;

export const DIARY_COLUMNS =
  "id, patient_id, protocol_id, visit_id, source_system, source_ref, period_start, period_end, expected_days, completed_days, missed_doses, possible_ae, ae_note, new_medications, new_medications_note, note, reviewer_role, reviewed_at";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).nullable().optional();

export const diaryInputSchema = z
  .object({
    patient_id: z.string().uuid("Paciente inválido."),
    protocol_id: z.string().uuid("Protocolo inválido."),
    visit_id: z.string().uuid("Visita inválida.").nullable().optional(),
    source_system: z.enum(DIARY_SOURCES, { error: "Indica el sistema del diario." }),
    source_ref: z
      .string()
      .trim()
      .min(1, "Indica la referencia del diario (sujeto, periodo o folio).")
      .max(200),
    period_start: isoDate,
    period_end: isoDate,
    expected_days: z.coerce.number().int("Días esperados inválidos.").min(1).max(366),
    completed_days: z.coerce.number().int("Días completados inválidos.").min(0),
    missed_doses: z.coerce.number().int("Dosis omitidas inválidas.").min(0).max(999).default(0),
    possible_ae: z.boolean().default(false),
    ae_note: optionalText(500),
    new_medications: z.boolean().default(false),
    new_medications_note: optionalText(500),
    note: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (v.period_end < v.period_start) {
      ctx.addIssue({
        code: "custom",
        path: ["period_end"],
        message: "El fin del periodo no puede ser anterior al inicio.",
      });
      return;
    }
    const length = periodDays(v.period_start, v.period_end);
    if (v.expected_days > length) {
      ctx.addIssue({
        code: "custom",
        path: ["expected_days"],
        message: `El periodo tiene ${length} días; no puedes esperar más.`,
      });
    }
    if (v.completed_days > v.expected_days) {
      ctx.addIssue({
        code: "custom",
        path: ["completed_days"],
        message: "Los días completados no pueden superar los esperados.",
      });
    }
    if (v.possible_ae && (v.ae_note ?? "").length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["ae_note"],
        message: "Describe el posible evento adverso.",
      });
    }
    if (v.new_medications && (v.new_medications_note ?? "").length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["new_medications_note"],
        message: "Indica qué medicación nueva reporta el paciente.",
      });
    }
  });

export type DiaryInput = z.infer<typeof diaryInputSchema>;

export interface DiaryReview {
  id: string;
  patient_id: string;
  protocol_id: string;
  visit_id: string | null;
  source_system: DiarySource;
  source_ref: string;
  period_start: string;
  period_end: string;
  expected_days: number;
  completed_days: number;
  missed_doses: number;
  possible_ae: boolean;
  ae_note: string | null;
  new_medications: boolean;
  new_medications_note: string | null;
  note: string | null;
  reviewer_role: string | null;
  reviewed_at: string;
}

export function periodDays(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function compliancePct(review: Pick<DiaryReview, "expected_days" | "completed_days">): number {
  if (review.expected_days <= 0) return 0;
  return Math.round((review.completed_days / review.expected_days) * 1000) / 10;
}

export type DiaryFlagKind = "low_compliance" | "missed_doses" | "ae_unrecorded" | "ae_open" | "new_medications";

export interface DiaryFlag {
  kind: DiaryFlagKind;
  label: string;
}

export interface VisitForDiary {
  id: string;
  status: string;
  actual_on: string | null;
  adverse_event: boolean;
}

/**
 * Señales para el revisor. No deciden nada: el posible EA y la medicación nueva
 * deben pasar por el registro de la visita y la conciliación farmacológica.
 */
export function diaryFlags(review: DiaryReview, visit?: VisitForDiary | null): DiaryFlag[] {
  const flags: DiaryFlag[] = [];
  const pct = compliancePct(review);
  if (pct < LOW_COMPLIANCE_PCT) {
    flags.push({ kind: "low_compliance", label: `Cumplimiento del diario ${pct}% (< ${LOW_COMPLIANCE_PCT}%)` });
  }
  if (review.missed_doses > 0) {
    flags.push({ kind: "missed_doses", label: `${review.missed_doses} dosis omitidas` });
  }
  if (review.possible_ae) {
    if (visit && !visit.adverse_event) {
      flags.push({
        kind: "ae_unrecorded",
        label: "Posible evento adverso en el diario que la visita no registra",
      });
    } else {
      flags.push({ kind: "ae_open", label: "Posible evento adverso para valoración del investigador" });
    }
  }
  if (review.new_medications) {
    flags.push({ kind: "new_medications", label: "Medicación nueva: concíliala antes de seguir" });
  }
  return flags;
}

export function latestByVisit(reviews: DiaryReview[]): Map<string, DiaryReview> {
  const map = new Map<string, DiaryReview>();
  for (const review of reviews) {
    if (!review.visit_id) continue;
    const current = map.get(review.visit_id);
    if (!current || review.reviewed_at > current.reviewed_at) map.set(review.visit_id, review);
  }
  return map;
}

/** Visitas ya realizadas cuyo diario todavía no se revisó. */
export function visitsPendingDiaryReview<V extends VisitForDiary>(
  visits: V[],
  reviews: DiaryReview[]
): V[] {
  const reviewed = latestByVisit(reviews);
  return visits.filter(
    (v) => (v.status === "completed" || v.status === "out_of_window") && !reviewed.has(v.id)
  );
}

/** Periodo sugerido: desde el día siguiente a la visita realizada anterior hasta esta visita. */
export function suggestPeriod(
  visits: Array<{ id: string; actual_on: string | null; baseline_on: string }>,
  visitId: string
): { start: string; end: string } | null {
  const current = visits.find((v) => v.id === visitId);
  if (!current?.actual_on) return null;
  const previous = visits
    .filter((v) => v.id !== visitId && v.actual_on && v.actual_on < current.actual_on!)
    .map((v) => v.actual_on as string)
    .sort()
    .pop();
  const start = addUtcDays(previous ?? current.baseline_on, previous ? 1 : 0);
  return { start, end: current.actual_on };
}

export interface DiarySummary {
  total: number;
  avgCompliancePct: number | null;
  withFlags: number;
  pendingAe: number;
}

export function summarizeDiaryReviews(reviews: DiaryReview[]): DiarySummary {
  if (reviews.length === 0) return { total: 0, avgCompliancePct: null, withFlags: 0, pendingAe: 0 };
  const expected = reviews.reduce((s, r) => s + r.expected_days, 0);
  const completed = reviews.reduce((s, r) => s + r.completed_days, 0);
  return {
    total: reviews.length,
    avgCompliancePct: expected > 0 ? Math.round((completed / expected) * 1000) / 10 : null,
    withFlags: reviews.filter((r) => diaryFlags(r).length > 0).length,
    pendingAe: reviews.filter((r) => r.possible_ae).length,
  };
}

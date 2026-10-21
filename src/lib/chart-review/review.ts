import { z } from "zod";
import type {
  CriterionResult,
  CriterionStatus,
  LabCriterion,
  Protocol,
} from "@/lib/types";
import { siteDisplayName, siteLocation, type SiteProfile } from "@/lib/site/profile";

export const CHART_REVIEW_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021110000_chart_review.sql en Supabase.";

export const REVIEW_DECISIONS = ["confirmed", "rejected", "clarify"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DECISION_LABELS: Record<ReviewDecision, string> = {
  confirmed: "La fuente confirma",
  rejected: "La fuente no coincide",
  clarify: "Requiere aclaración",
};

export const SOURCE_TYPES = [
  "visit_note",
  "lab_report",
  "referral",
  "edc_import",
  "patient_interview",
  "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_LABELS: Record<SourceType, string> = {
  visit_note: "Nota de visita",
  lab_report: "Informe de laboratorio",
  referral: "Referencia o resumen clínico",
  edc_import: "Exportación EDC",
  patient_interview: "Entrevista con el paciente",
  other: "Otra fuente",
};

export const REVIEW_COLUMNS =
  "id, patient_id, protocol_id, criterion, criterion_type, engine_status, engine_evidence, decision, source_type, source_ref, observed_on, source_value, note, reviewer_role, reviewed_at";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

export const reviewInputSchema = z
  .object({
    patient_id: z.string().uuid("Paciente inválido."),
    protocol_id: z.string().uuid("Protocolo inválido."),
    criterion: z.string().trim().min(1).max(300),
    criterion_type: z.enum(["inclusion", "exclusion"]),
    engine_status: z.enum(["pass", "fail", "missing"]),
    engine_evidence: z.array(z.string().max(200)).max(10).default([]),
    decision: z.enum(REVIEW_DECISIONS, { error: "Decisión inválida." }),
    source_type: z.enum(SOURCE_TYPES).nullable().optional(),
    source_ref: z.string().trim().max(200).nullable().optional(),
    observed_on: isoDate.nullable().optional(),
    source_value: z.string().trim().max(60).nullable().optional(),
    note: z.string().trim().max(500, "La nota admite hasta 500 caracteres.").nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "clarify") {
      if ((v.note ?? "").length < 3) {
        ctx.addIssue({ code: "custom", path: ["note"], message: "Explica qué falta aclarar." });
      }
      return;
    }
    if (!v.source_type) {
      ctx.addIssue({ code: "custom", path: ["source_type"], message: "Indica el tipo de fuente." });
    }
    if (!v.source_ref) {
      ctx.addIssue({ code: "custom", path: ["source_ref"], message: "Indica el documento o referencia de la fuente." });
    }
    if (!v.observed_on) {
      ctx.addIssue({ code: "custom", path: ["observed_on"], message: "Indica la fecha del dato en la fuente." });
    }
  });

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export interface CriterionReview {
  id: string;
  patient_id: string;
  protocol_id: string;
  criterion: string;
  criterion_type: "inclusion" | "exclusion";
  engine_status: CriterionStatus;
  engine_evidence: string[];
  decision: ReviewDecision;
  source_type: SourceType | null;
  source_ref: string | null;
  observed_on: string | null;
  source_value: string | null;
  note: string | null;
  reviewer_role: string | null;
  reviewed_at: string;
}

export type ReviewState =
  | "unreviewed"
  | "confirmed"
  | "rejected"
  | "clarify"
  | "stale"
  | "outdated"
  | "discrepancy";

export const STATE_LABELS: Record<ReviewState, string> = {
  unreviewed: "Sin revisar",
  confirmed: "Confirmado en la fuente",
  rejected: "No coincide con la fuente",
  clarify: "Requiere aclaración",
  stale: "Dato fuera de vigencia",
  outdated: "El motor cambió desde la revisión",
  discrepancy: "Valor distinto al de la fuente",
};

export interface ReviewRow {
  detail: CriterionResult;
  review: CriterionReview | null;
  reviewCount: number;
  state: ReviewState;
  flag: string | null;
}

export interface ReviewSummary {
  total: number;
  confirmed: number;
  open: number;
  unreviewed: number;
  discrepancies: number;
  /** Todo revisado y sin pendientes: listo para que el investigador decida. */
  readyForInvestigator: boolean;
}

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function ageInDays(observedOn: string, today: Date = new Date()): number {
  return Math.round((dayMs(localDay(today)) - dayMs(observedOn)) / 86_400_000);
}

export function labFor(criterion: string, protocol: Pick<Protocol, "inclusion_criteria">): LabCriterion | undefined {
  const text = criterion.toLowerCase();
  return (protocol.inclusion_criteria?.required_labs ?? []).find((lab) =>
    text.startsWith(`lab ${lab.name.toLowerCase()} `)
  );
}

/** Número que el motor citó como evidencia (p. ej. "hba1c: 8.2 %" → 8.2). */
export function engineNumber(evidence: string[]): number | null {
  for (const item of evidence) {
    const match = item.match(/:\s*(-?\d+(?:[.,]\d+)?)/);
    if (match) return Number(match[1].replace(",", "."));
  }
  return null;
}

/** `true` si la fuente trae un valor distinto al del sistema; `null` si no se puede comparar. */
export function valueMismatch(evidence: string[], sourceValue: string | null | undefined): boolean | null {
  if (!sourceValue) return null;
  const systemValue = engineNumber(evidence);
  const match = sourceValue.match(/-?\d+(?:[.,]\d+)?/);
  if (systemValue === null || !match) return null;
  return Math.abs(Number(match[0].replace(",", ".")) - systemValue) > 1e-9;
}

export function latestReviews(reviews: CriterionReview[]): Map<string, CriterionReview> {
  const map = new Map<string, CriterionReview>();
  for (const r of reviews) {
    const current = map.get(r.criterion);
    if (!current || r.reviewed_at > current.reviewed_at) map.set(r.criterion, r);
  }
  return map;
}

export function buildReviewRows(
  details: CriterionResult[],
  reviews: CriterionReview[],
  protocol: Pick<Protocol, "inclusion_criteria">,
  today: Date = new Date()
): ReviewRow[] {
  const latest = latestReviews(reviews);
  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(r.criterion, (counts.get(r.criterion) ?? 0) + 1);

  return details.map((detail) => {
    const review = latest.get(detail.criterion) ?? null;
    const reviewCount = counts.get(detail.criterion) ?? 0;
    if (!review) return { detail, review, reviewCount, state: "unreviewed", flag: null };

    if (review.engine_status !== detail.status) {
      return {
        detail,
        review,
        reviewCount,
        state: "outdated",
        flag: "El expediente cambió después de esta revisión; vuelve a revisarlo.",
      };
    }
    if (review.decision === "rejected") {
      return { detail, review, reviewCount, state: "rejected", flag: "La fuente contradice lo que muestra el sistema." };
    }
    if (review.decision === "clarify") {
      return { detail, review, reviewCount, state: "clarify", flag: review.note };
    }
    if (valueMismatch(review.engine_evidence, review.source_value)) {
      return {
        detail,
        review,
        reviewCount,
        state: "discrepancy",
        flag: `El sistema tiene ${engineNumber(review.engine_evidence)} y la fuente dice ${review.source_value}.`,
      };
    }
    const lab = labFor(detail.criterion, protocol);
    if (lab?.max_age_days && review.observed_on) {
      const age = ageInDays(review.observed_on, today);
      if (age > lab.max_age_days) {
        return {
          detail,
          review,
          reviewCount,
          state: "stale",
          flag: `El dato tiene ${age} días y el protocolo acepta hasta ${lab.max_age_days}.`,
        };
      }
    }
    return { detail, review, reviewCount, state: "confirmed", flag: null };
  });
}

export function summarizeReview(rows: ReviewRow[]): ReviewSummary {
  const confirmed = rows.filter((r) => r.state === "confirmed").length;
  const unreviewed = rows.filter((r) => r.state === "unreviewed").length;
  const open = rows.length - confirmed - unreviewed;
  return {
    total: rows.length,
    confirmed,
    open,
    unreviewed,
    discrepancies: rows.filter((r) => r.state === "rejected" || r.state === "discrepancy").length,
    readyForInvestigator: rows.length > 0 && unreviewed === 0 && open === 0,
  };
}

function csvEscape(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const ENGINE_LABELS: Record<CriterionStatus, string> = {
  pass: "Cumple",
  fail: "No cumple",
  missing: "Falta información",
};

export function reviewSheetToCsv(
  rows: ReviewRow[],
  context: { subjectCode: string | null; protocolCode: string },
  site?: SiteProfile | null,
  reportDate: Date = new Date()
): string {
  const lines: string[] = [];
  const siteName = siteDisplayName(site);
  if (site && siteName) {
    lines.push(["Hoja de revisión de expediente", siteName].map(csvEscape).join(","));
    if (site.pi_name) lines.push(["Investigador principal", site.pi_name].map(csvEscape).join(","));
    const where = siteLocation(site);
    if (where) lines.push(["Ubicación", where].map(csvEscape).join(","));
  }
  lines.push(["Protocolo", context.protocolCode].map(csvEscape).join(","));
  lines.push(["Sujeto", context.subjectCode || "Sin código"].map(csvEscape).join(","));
  lines.push(["Fecha del reporte", reportDate.toISOString().slice(0, 10)].join(","));
  lines.push("");
  lines.push(
    [
      "criterio",
      "tipo",
      "resultado_sistema",
      "evidencia_sistema",
      "estado_revision",
      "decision",
      "fuente",
      "referencia",
      "fecha_del_dato",
      "valor_en_fuente",
      "nota",
      "rol_revisor",
      "fecha_revision",
      "revisiones",
    ].join(",")
  );
  for (const row of rows) {
    const r = row.review;
    lines.push(
      [
        csvEscape(row.detail.criterion),
        row.detail.type === "inclusion" ? "inclusión" : "exclusión",
        ENGINE_LABELS[row.detail.status],
        csvEscape((row.detail.evidence ?? []).join(" | ")),
        csvEscape(STATE_LABELS[row.state]),
        r ? csvEscape(DECISION_LABELS[r.decision]) : "",
        r?.source_type ? csvEscape(SOURCE_LABELS[r.source_type]) : "",
        csvEscape(r?.source_ref ?? ""),
        r?.observed_on ?? "",
        csvEscape(r?.source_value ?? ""),
        csvEscape(r?.note ?? ""),
        csvEscape(r?.reviewer_role ?? ""),
        r ? r.reviewed_at.slice(0, 10) : "",
        String(row.reviewCount),
      ].join(",")
    );
  }
  return lines.join("\n");
}

import { z } from "zod";
import { findMatchingTerms } from "@/lib/matching/aliases";

export const MED_SOURCE_TYPES = [
  "visit_note",
  "lab_report",
  "referral",
  "edc_import",
  "patient_interview",
  "pharmacy_record",
  "other",
] as const;
export type MedSourceType = (typeof MED_SOURCE_TYPES)[number];

export const MED_SOURCE_LABELS: Record<MedSourceType, string> = {
  visit_note: "Nota de visita",
  lab_report: "Informe de laboratorio",
  referral: "Referencia o resumen clínico",
  edc_import: "Exportación EDC",
  patient_interview: "Entrevista con el paciente",
  pharmacy_record: "Registro de farmacia",
  other: "Otra fuente",
};

export const MEDICATION_COLUMNS =
  "id, patient_id, drug_name, dose, started_on, ended_on, source_type, source_ref, verified_on";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

export const medicationInputSchema = z
  .object({
    patient_id: z.string().uuid("Paciente inválido."),
    drug_name: z.string().trim().min(2, "Escribe el medicamento.").max(160),
    dose: z.string().trim().max(80).nullable().optional(),
    started_on: isoDate.nullable().optional(),
    ended_on: isoDate.nullable().optional(),
    source_type: z.enum(MED_SOURCE_TYPES, { error: "Fuente inválida." }),
    source_ref: z.string().trim().max(200).nullable().optional(),
    verified_on: isoDate.nullable().optional(),
  })
  .refine((v) => !v.started_on || !v.ended_on || v.ended_on >= v.started_on, {
    message: "La fecha de fin no puede ser anterior al inicio.",
    path: ["ended_on"],
  });

export const medicationUpdateSchema = z.object({
  id: z.string().uuid("Medicamento inválido."),
  ended_on: isoDate.nullable().optional(),
  verified_on: isoDate.nullable().optional(),
});

export interface StructuredMedication {
  id: string;
  patient_id: string;
  drug_name: string;
  dose: string | null;
  started_on: string | null;
  ended_on: string | null;
  source_type: MedSourceType;
  source_ref: string | null;
  verified_on: string | null;
}

export const VERIFICATION_MAX_AGE_DAYS = 30;

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const addDays = (iso: string, days: number) =>
  new Date(dayMs(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Se toma hoy: ya inició y no ha terminado (el día de fin cuenta como último día). */
export function isMedicationActive(m: StructuredMedication, today: Date = new Date()): boolean {
  const t = localDay(today);
  return (!m.started_on || m.started_on <= t) && (!m.ended_on || m.ended_on >= t);
}

export type ExclusionMedState = "blocked" | "washout" | "clear" | "unverified";

export interface ExclusionMedCheck {
  excluded: string;
  state: ExclusionMedState;
  /** Fecha desde la que cumpliría el lavado; solo en `washout`. */
  clearOn: string | null;
  daysLeft: number | null;
  evidence: string[];
}

export interface MedicationDiscrepancy {
  kind: "profile_only" | "reconciled_only";
  drug: string;
}

export interface MedicationReconciliation {
  active: StructuredMedication[];
  checks: ExclusionMedCheck[];
  discrepancies: MedicationDiscrepancy[];
  needsVerification: StructuredMedication[];
  hasReconciledList: boolean;
}

const describe = (m: StructuredMedication) =>
  `${m.drug_name}${m.dose ? ` ${m.dose}` : ""}${m.started_on ? ` desde ${m.started_on}` : ""}${m.ended_on ? ` hasta ${m.ended_on}` : ""}`;

export function reconcileMedications(
  structured: StructuredMedication[],
  profileMedications: string[],
  excludedMedications: string[],
  washoutDays: number | null | undefined,
  today: Date = new Date()
): MedicationReconciliation {
  const t = localDay(today);
  const active = structured.filter((m) => isMedicationActive(m, today));
  const names = structured.map((m) => m.drug_name);
  const hasReconciledList = structured.length > 0;

  const checks: ExclusionMedCheck[] = excludedMedications.map((excluded) => {
    if (!hasReconciledList) {
      return { excluded, state: "unverified", clearOn: null, daysLeft: null, evidence: [] };
    }
    const hits = findMatchingTerms(names, excluded);
    const matches = structured.filter((m) => hits.includes(m.drug_name));
    const current = matches.filter((m) => isMedicationActive(m, today));
    if (current.length > 0) {
      return { excluded, state: "blocked", clearOn: null, daysLeft: null, evidence: current.map(describe) };
    }
    const ended = matches.filter((m) => m.ended_on).sort((a, b) => b.ended_on!.localeCompare(a.ended_on!));
    if (ended.length > 0 && washoutDays && washoutDays > 0) {
      const clearOn = addDays(ended[0].ended_on!, washoutDays);
      if (clearOn > t) {
        return {
          excluded,
          state: "washout",
          clearOn,
          daysLeft: Math.round((dayMs(clearOn) - dayMs(t)) / 86_400_000),
          evidence: [describe(ended[0])],
        };
      }
    }
    return { excluded, state: "clear", clearOn: null, daysLeft: null, evidence: matches.map(describe) };
  });

  const discrepancies: MedicationDiscrepancy[] = [];
  if (hasReconciledList) {
    for (const med of profileMedications) {
      if (findMatchingTerms(names, med).length === 0) {
        discrepancies.push({ kind: "profile_only", drug: med });
      }
    }
    for (const m of active) {
      if (findMatchingTerms(profileMedications, m.drug_name).length === 0) {
        discrepancies.push({ kind: "reconciled_only", drug: m.drug_name });
      }
    }
  }

  const needsVerification = active.filter(
    (m) =>
      !m.verified_on ||
      Math.round((dayMs(t) - dayMs(m.verified_on)) / 86_400_000) > VERIFICATION_MAX_AGE_DAYS
  );

  return { active, checks, discrepancies, needsVerification, hasReconciledList };
}

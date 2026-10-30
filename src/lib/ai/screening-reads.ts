import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEnrollmentProgress, PACE_LABELS } from "@/lib/enrollment/targets";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import { buildMorningList, type MorningGap } from "@/lib/matching/morning-list";
import { firstEmbedded } from "@/lib/supabase/embed";
import {
  PATIENT_WITH_PROFILE_COLUMNS,
  PROTOCOL_LIST_COLUMNS,
  SCREENING_LIST_WITH_DETAILS,
} from "@/lib/supabase/query-columns";
import type {
  ClinicalProfile,
  CriterionResult,
  Patient,
  Protocol,
  ScreeningStatus,
} from "@/lib/types";
import { toPatientInitials } from "@/lib/utils";
import type { VisitRow } from "@/lib/ops/visits";
import { normalizeVisit } from "@/lib/ops/visits";

const LIMIT = 25;

const GAP_LABEL: Record<MorningGap, string> = {
  eligible: "listo para decidir",
  pending: "falta información",
  excluded: "no cumple un criterio",
  no_chart: "sin ficha en el registro",
  no_protocols: "el centro no tiene protocolos activos",
};

const STAGE_LABEL: Record<"pre_screening" | "screening", string> = {
  pre_screening: "Pre-screening",
  screening: "Screening",
};

export function zonedTomorrowWindow(
  now: Date,
  timeZone: string
): { start: Date; end: Date } {
  let zone = timeZone;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "America/Mexico_City";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const hour = read("hour") === 24 ? 0 : read("hour");
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second")
  );
  const offset = asUtc - now.getTime();
  const start = Date.UTC(read("year"), read("month") - 1, read("day")) - offset + 86_400_000;
  return { start: new Date(start), end: new Date(start + 86_400_000) };
}

function schemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /schema cache|does not exist|could not find/i.test(error.message ?? "")
  );
}

export type MissingDecision = {
  initials: string;
  protocol: string;
  stage: string;
  missing: string[];
};

/** Criterios que el motor marcó como faltantes. No incluye evidencia ni nombres. */
export function missingDecisions(rows: {
  status: ScreeningStatus;
  protocolCode: string;
  firstName: string;
  lastName: string;
  details: { status: string; criterion: string; evidence?: string[] }[];
}[]): { count: number; items: MissingDecision[] } {
  const items = rows
    .filter(
      (row): row is typeof row & { status: "pre_screening" | "screening" } =>
        row.status === "pre_screening" || row.status === "screening"
    )
    .map((row) => ({
      initials: toPatientInitials(row.firstName, row.lastName),
      protocol: row.protocolCode,
      stage: STAGE_LABEL[row.status],
      missing: row.details
        .filter((detail) => detail.status === "missing")
        .map((detail) => detail.criterion),
    }))
    .filter((row) => row.missing.length > 0);

  return { count: items.length, items: items.slice(0, LIMIT) };
}

export type MorningAppointment = {
  time: string;
  initials: string;
  protocol: string | null;
  gap: string;
  criterion: string | null;
};

export function morningAppointments(
  items: {
    scheduledAt: string;
    patientName: string;
    protocolCode: string | null;
    gap: MorningGap;
    criterion: string | null;
  }[],
  timeZone: string
): { count: number; items: MorningAppointment[] } {
  const clock = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  const mapped = items.map((item) => ({
    time: clock.format(new Date(item.scheduledAt)),
    initials: initialsFromVisitLabel(item.patientName),
    protocol: item.protocolCode,
    gap: GAP_LABEL[item.gap],
    criterion: item.criterion,
  }));
  return { count: mapped.length, items: mapped.slice(0, LIMIT) };
}

export function initialsFromVisitLabel(label: string): string {
  const [last, first] = label.split(",").map((part) => part.trim());
  if (!first || !last || last === "Paciente") return "Sin ficha";
  return toPatientInitials(first, last);
}

export type EnrollmentSnapshot = {
  protocol: string;
  pace: string;
  randomized: number;
  target: number;
  remaining: number;
  percent: number;
  daysLeft: number | null;
};

export function enrollmentSnapshots(
  rows: {
    protocolCode: string;
    pace: keyof typeof PACE_LABELS;
    randomized: number;
    target: number;
    remaining: number;
    percent: number;
    daysLeft: number | null;
  }[]
): { count: number; items: EnrollmentSnapshot[] } {
  const items = rows.map((row) => ({
    protocol: row.protocolCode,
    pace: PACE_LABELS[row.pace],
    randomized: row.randomized,
    target: row.target,
    remaining: row.remaining,
    percent: row.percent,
    daysLeft: row.daysLeft,
  }));
  return { count: items.length, items };
}

type Pair = { patient: Patient; profile: ClinicalProfile | null };

async function loadPairs(
  supabase: SupabaseClient
): Promise<{ pairs: Pair[]; error?: string }> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_WITH_PROFILE_COLUMNS)
    .order("last_name");
  if (error) {
    return {
      pairs: [],
      error: schemaMissing(error)
        ? "No se pudo leer el registro del centro."
        : error.message,
    };
  }
  const pairs = ((data ?? []) as unknown as (Patient & {
    clinical_profiles: ClinicalProfile | ClinicalProfile[] | null;
  })[]).map((row) => {
    const { clinical_profiles, ...patient } = row;
    return { patient: patient as Patient, profile: firstEmbedded(clinical_profiles) };
  });
  return { pairs };
}

export async function readMissingDecisions(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data: protocols, error: protocolError } = await supabase
    .from("protocols")
    .select(PROTOCOL_LIST_COLUMNS)
    .eq("clinic_id", organizationId);
  if (protocolError) return { error: "No se pudieron leer los protocolos." };

  const loaded = await loadPairs(supabase);
  if (loaded.error) return { error: loaded.error };
  const byPatient = new Map(loaded.pairs.map((pair) => [pair.patient.id, pair]));
  const byProtocol = new Map(
    ((protocols ?? []) as unknown as Protocol[]).map((protocol) => [protocol.id, protocol])
  );

  const { data, error } = await supabase
    .from("screenings")
    .select(SCREENING_LIST_WITH_DETAILS)
    .in("status", ["pre_screening", "screening"])
    .eq("patients.clinic_id", organizationId);
  if (error) return { error: "No se pudo leer el pipeline." };

  const rows = ((data ?? []) as unknown as {
    status: ScreeningStatus;
    patient_id: string;
    protocol_id: string;
    match_details: CriterionResult[] | null;
    patients: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    protocols: { code_name: string } | { code_name: string }[] | null;
  }[]).map((row) => {
      const patientEmbed = firstEmbedded(row.patients);
      const protocolEmbed = firstEmbedded(row.protocols);
      const pair = byPatient.get(row.patient_id);
      const protocol = byProtocol.get(row.protocol_id);
      const stored = Array.isArray(row.match_details) ? row.match_details : [];
      const details =
        stored.length > 0 || !pair || !protocol
          ? stored
          : evaluatePatientAgainstProtocol(pair.patient, pair.profile, protocol).details;
      return {
        status: row.status,
        protocolCode: protocolEmbed?.code_name ?? protocol?.code_name ?? "—",
        firstName: pair?.patient.first_name ?? patientEmbed?.first_name ?? "",
        lastName: pair?.patient.last_name ?? patientEmbed?.last_name ?? "",
        details,
      };
    });

  return missingDecisions(rows);
}

export async function readMorningAppointments(
  supabase: SupabaseClient,
  organizationId: string,
  now: Date,
  timeZone: string
) {
  const window = zonedTomorrowWindow(now, timeZone);
  const { data, error } = await supabase
    .from("study_visits")
    .select(
      "id, patient_id, protocol_id, scheduled_at, location, status, notes, kind, clinician_name, patients(first_name, last_name, subject_code, phone, email), protocols(code_name)"
    )
    .eq("organization_id", organizationId)
    .gte("scheduled_at", window.start.toISOString())
    .lt("scheduled_at", window.end.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(200);
  if (error) {
    return {
      error: schemaMissing(error)
        ? "Falta aplicar el esquema de citas en Supabase."
        : "No se pudieron leer las citas.",
    };
  }

  const loaded = await loadPairs(supabase);
  const { data: protocols, error: protocolError } = await supabase
    .from("protocols")
    .select(PROTOCOL_LIST_COLUMNS)
    .eq("clinic_id", organizationId)
    .eq("status", "active");
  if (loaded.error) return { error: loaded.error };
  if (protocolError) return { error: "No se pudieron leer los protocolos." };

  const visits = ((data ?? []) as unknown as Parameters<typeof normalizeVisit>[0][]).map(
    normalizeVisit
  ) as VisitRow[];
  const items = buildMorningList({
    visits,
    pairs: loaded.pairs,
    protocols: (protocols ?? []) as unknown as Protocol[],
    now,
    window,
  });
  return morningAppointments(items, timeZone);
}

export async function readEnrollmentTargets(
  supabase: SupabaseClient,
  organizationId: string,
  now: Date
) {
  const { data: targets, error } = await supabase
    .from("protocol_enrollment_targets")
    .select("protocol_id, target_randomized, start_date, end_date")
    .eq("organization_id", organizationId);
  if (error) {
    return {
      error: schemaMissing(error)
        ? "Falta aplicar la migración de metas de enrolamiento."
        : "No se pudieron leer las metas.",
    };
  }
  if (!targets?.length) {
    return { count: 0, items: [] as EnrollmentSnapshot[] };
  }

  const { data: protocols, error: protocolError } = await supabase
    .from("protocols")
    .select("id, code_name")
    .eq("clinic_id", organizationId);
  if (protocolError) return { error: "No se pudieron leer los protocolos." };

  const { data: screenings, error: screeningError } = await supabase
    .from("screenings")
    .select("protocol_id, status, patients!inner(clinic_id)")
    .eq("patients.clinic_id", organizationId)
    .limit(5000);
  if (screeningError) return { error: "No se pudo leer el pipeline." };

  const codes = new Map(
    ((protocols ?? []) as { id: string; code_name: string }[]).map((protocol) => [
      protocol.id,
      protocol.code_name,
    ])
  );
  const progress = buildEnrollmentProgress(
    targets as {
      protocol_id: string;
      target_randomized: number;
      start_date: string | null;
      end_date: string | null;
    }[],
    (screenings ?? []) as { protocol_id: string; status: ScreeningStatus }[],
    now
  );
  return enrollmentSnapshots(
    progress.map((row) => ({
      protocolCode: codes.get(row.protocolId) ?? "Protocolo",
      pace: row.pace,
      randomized: row.randomized,
      target: row.target,
      remaining: row.remaining,
      percent: row.percent,
      daysLeft: row.daysLeft,
    }))
  );
}

export async function knownPatientNames(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data } = await supabase.from("patients").select("first_name, last_name").limit(500);
  return ((data ?? []) as { first_name: string; last_name: string }[]).flatMap((row) => [
    row.first_name,
    row.last_name,
  ]);
}

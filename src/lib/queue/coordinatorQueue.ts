import type { CriterionResult } from "@/lib/types";
import { toPatientInitials } from "@/lib/utils";
import { getServiceSupabase } from "@/lib/screening-services";

function requireOrg(organizationId: string | undefined): string | { error: string } {
  const id = organizationId?.trim();
  if (!id) return { error: "Falta organizationId para consultar la cola." };
  return id;
}

export type SubmissionRow = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
  contact_phone: string | null;
  match_results: Array<{ protocol_code?: string; verdict?: string; score?: number }> | null;
};

export type ScreeningPatientRel = { first_name: string; last_name: string; clinic_id: string };
export type ScreeningProtocolRel = { code_name: string; title: string };

export type ScreeningRow = {
  id: string;
  patient_id: string;
  protocol_id: string;
  status: string;
  match_details?: CriterionResult[] | null;
  patients: ScreeningPatientRel | ScreeningPatientRel[] | null;
  protocols: ScreeningProtocolRel | ScreeningProtocolRel[] | null;
};

export const OUTREACH_TEMPLATES = {
  te_llamamos:
    "Hola, te escribimos del centro de investigación. Te vamos a llamar para coordinar el pre-screening. Gracias.",
  trae_receta:
    "Hola, para la visita de pre-screening trae tu receta o el último laboratorio, por favor.",
  link_portal:
    "Hola, completa tu pre-registro en el portal del centro. Tu coordinador te comparte el link.",
} as const;

export const OUTREACH_KINDS = ["te_llamamos", "trae_receta", "link_portal"] as const;

export type OutreachKind = (typeof OUTREACH_KINDS)[number];

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapInboxItem(row: SubmissionRow) {
  const top = row.match_results?.[0];
  return {
    initials: toPatientInitials(row.first_name, row.last_name),
    has_phone: Boolean(row.contact_phone?.trim()),
    waiting_since: row.created_at,
    top_verdict: top?.verdict ?? "sin_match",
    top_protocol: top?.protocol_code ?? "—",
    href: "/candidatos",
    next_action: "Revisar en /candidatos (convertir o archivar).",
  };
}

export function mapYellowItem(row: ScreeningRow) {
  const details = (row.match_details ?? []) as CriterionResult[];
  const missing = details
    .filter((d) => d.status === "missing")
    .map((d) => d.criterion)
    .slice(0, 4);
  if (missing.length === 0) return null;
  const patient = firstRel(row.patients);
  const protocol = firstRel(row.protocols);
  if (!patient) return null;
  return {
    initials: toPatientInitials(patient.first_name, patient.last_name),
    protocol: protocol?.code_name ?? "—",
    missing,
    href: `/patients/${row.patient_id}`,
    next_action: "Completar labs o datos en el expediente.",
  };
}

export function mapRematchItem(row: ScreeningRow) {
  const patient = firstRel(row.patients);
  const protocol = firstRel(row.protocols);
  if (!patient) return null;
  return {
    initials: toPatientInitials(patient.first_name, patient.last_name),
    failed_protocol: protocol?.code_name ?? "—",
    href: "/rematch",
    next_action: "Abrir Re-Match y proponer otro protocolo activo.",
  };
}

/** Cola del coordinador: inbox, criterios 🟡 y screen failures. Solo iniciales. */
export async function getCoordinatorQueue(input: { organizationId: string }) {
  const organizationId = requireOrg(input.organizationId);
  if (typeof organizationId !== "string") return organizationId;

  const supabase = getServiceSupabase();

  const [inboxRes, yellowRes, failRes] = await Promise.all([
    supabase
      .from("pre_screen_submissions")
      .select("id, first_name, last_name, status, created_at, contact_phone, match_results")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(15),
    supabase
      .from("screenings")
      .select(
        "id, patient_id, protocol_id, status, match_details, patients!inner(first_name, last_name, clinic_id), protocols(code_name, title)"
      )
      .in("status", ["pre_screening", "screening"])
      .eq("patients.clinic_id", organizationId)
      .limit(40),
    supabase
      .from("screenings")
      .select(
        "id, patient_id, protocol_id, status, patients!inner(first_name, last_name, clinic_id), protocols(code_name, title)"
      )
      .eq("status", "screen_failure")
      .eq("patients.clinic_id", organizationId)
      .limit(20),
  ]);

  if (inboxRes.error) return { error: inboxRes.error.message };
  if (yellowRes.error) return { error: yellowRes.error.message };
  if (failRes.error) return { error: failRes.error.message };

  const inbox = ((inboxRes.data ?? []) as SubmissionRow[]).map(mapInboxItem);

  const yellow = ((yellowRes.data ?? []) as ScreeningRow[])
    .map(mapYellowItem)
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, 12);

  const rematch = ((failRes.data ?? []) as ScreeningRow[])
    .map(mapRematchItem)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    summary: {
      inbox: inbox.length,
      yellow: yellow.length,
      rematch: rematch.length,
      total: inbox.length + yellow.length + rematch.length,
    },
    inbox,
    yellow,
    rematch,
    hint: "No cambies elegibilidad. El coordinador confirma en la app.",
  };
}

export function draftOutreachTemplate(kind: OutreachKind, initials?: string) {
  return {
    kind,
    initials: initials?.trim() || null,
    message: OUTREACH_TEMPLATES[kind],
    href: "/candidatos",
    sent: false,
    note: "No se envía desde el agente. Copia el texto o ábrelo en /candidatos.",
  };
}

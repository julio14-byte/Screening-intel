import { createClient } from "@/lib/supabase/server";
import type {
  CriterionResult,
  InformedConsent,
  PendingItem,
  ScreeningWithRelations,
  StudyVisit,
} from "@/lib/types";
import { VISIT_TYPE_LABELS } from "@/lib/visits/labels";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function patientName(row: {
  first_name?: string;
  last_name?: string;
} | null | undefined): string {
  if (!row) return "Paciente";
  return `${row.last_name ?? ""}, ${row.first_name ?? ""}`.replace(/^,\s*/, "").trim();
}

export async function listPendingItems(): Promise<PendingItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const items: PendingItem[] = [];

  const { data: screenings, error: screeningError } = await supabase
    .from("screenings")
    .select(
      "id, patient_id, protocol_id, status, match_details, patients(id, first_name, last_name), protocols(id, title, code_name, status)"
    )
    .in("status", ["pre_screening", "screening"])
    .limit(300);
  if (screeningError) throw new Error(screeningError.message);

  const { data: consents, error: consentError } = await supabase
    .from("informed_consents")
    .select("patient_id, protocol_id, status")
    .eq("status", "obtained");
  if (consentError) throw new Error(consentError.message);

  const consentKeys = new Set(
    ((consents ?? []) as Pick<InformedConsent, "patient_id" | "protocol_id" | "status">[])
      .map((row) => `${row.patient_id}:${row.protocol_id}`)
  );

  for (const raw of (screenings ?? []) as unknown as ScreeningWithRelations[]) {
    const screening = raw;
    const patient = firstRel(screening.patients);
    const protocol = firstRel(screening.protocols);
    const name = patientName(patient);
    const protocolLabel = protocol
      ? `${protocol.code_name} · ${protocol.title}`
      : null;
    const details = (screening.match_details ?? []) as CriterionResult[];
    const missing = details.filter((d) => d.status === "missing");
    for (const criterion of missing) {
      items.push({
        id: `crit-${screening.id}-${criterion.criterion}`,
        kind: "missing_criterion",
        title: criterion.criterion,
        detail: criterion.detail || "Falta información en el perfil para evaluar este criterio.",
        href: `/patients/${screening.patient_id}`,
        patientName: name,
        protocolLabel,
        dueAt: null,
      });
    }
    if (!consentKeys.has(`${screening.patient_id}:${screening.protocol_id}`)) {
      items.push({
        id: `icf-${screening.id}`,
        kind: "missing_consent",
        title: "Sin consentimiento informado",
        detail: "No hay ICF obtenido para este protocolo. Cárgalo en el expediente del paciente.",
        href: `/patients/${screening.patient_id}`,
        patientName: name,
        protocolLabel,
        dueAt: null,
      });
    }
  }

  const { data: visits, error: visitError } = await supabase
    .from("study_visits")
    .select(
      "id, patient_id, protocol_id, visit_type, scheduled_at, status, patients(id, first_name, last_name), protocols(id, title, code_name)"
    )
    .eq("status", "scheduled")
    .lt("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);
  if (visitError) throw new Error(visitError.message);

  for (const raw of (visits ?? []) as unknown as StudyVisit[]) {
    const visit = raw;
    const patient = firstRel(visit.patients);
    const protocol = firstRel(visit.protocols);
    items.push({
      id: `visit-${visit.id}`,
      kind: "overdue_visit",
      title: `${VISIT_TYPE_LABELS[visit.visit_type]} vencida`,
      detail: "La visita sigue programada después de la hora prevista.",
      href: "/agenda",
      patientName: patientName(patient),
      protocolLabel: protocol
        ? `${protocol.code_name} · ${protocol.title}`
        : null,
      dueAt: visit.scheduled_at,
    });
  }

  const rank: Record<PendingItem["kind"], number> = {
    overdue_visit: 0,
    missing_consent: 1,
    missing_criterion: 2,
  };
  items.sort((a, b) => rank[a.kind] - rank[b.kind] || a.patientName.localeCompare(b.patientName, "es"));
  return items;
}

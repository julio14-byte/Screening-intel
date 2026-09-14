import { listPendingItems } from "@/lib/queue/pendingItems";
import { createClient } from "@/lib/supabase/server";
import type { PendingItem, ScreeningStatus, VisitStatus } from "@/lib/types";
import {
  computeSiteFunnel,
  type FunnelScreening,
  type FunnelSubmission,
  type FunnelVisit,
  type SiteFunnelSnapshot,
} from "@/lib/dashboard/computeSiteFunnel";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function patientName(row: { first_name?: string; last_name?: string } | null): string {
  if (!row) return "Paciente";
  return `${row.last_name ?? ""}, ${row.first_name ?? ""}`.replace(/^,\s*/, "").trim();
}

async function safeRows<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) {
      console.error(`[funnel] ${label}:`, error.message);
      return [];
    }
    return (data as T[] | null) ?? [];
  } catch (err) {
    console.error(`[funnel] ${label}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Carga el tablero operativo del site (RLS del usuario).
 * Tablas aún no aplicadas (agenda, portal) quedan en cero.
 */
export async function loadSiteFunnel(): Promise<SiteFunnelSnapshot> {
  const supabase = await createClient();

  const [submissionRows, visitRows, screeningRows, pendingItems] = await Promise.all([
    safeRows<FunnelSubmission>(
      "candidatos",
      supabase
        .from("pre_screen_submissions")
        .select("id, status, created_at, converted_patient_id, first_name, last_name")
        .order("created_at", { ascending: false })
        .limit(500)
    ),
    safeRows<FunnelVisit>(
      "visitas",
      supabase
        .from("study_visits")
        .select("id, patient_id, scheduled_at, status, visit_type")
        .order("scheduled_at", { ascending: false })
        .limit(500)
    ),
    safeRows<FunnelScreening & { patients?: unknown; protocols?: unknown }>(
      "screenings",
      supabase
        .from("screenings")
        .select(
          "id, patient_id, protocol_id, status, created_at, patients(id, first_name, last_name, created_at), protocols(id, code_name, title)"
        )
        .order("created_at", { ascending: false })
        .limit(800)
    ),
    (async (): Promise<PendingItem[]> => {
      try {
        return await listPendingItems();
      } catch (err) {
        console.error("[funnel] pendientes:", err instanceof Error ? err.message : err);
        return [];
      }
    })(),
  ]);

  const screenings: FunnelScreening[] = screeningRows.map((row) => {
    const patient = firstRel(
      row.patients as
        | { first_name?: string; last_name?: string; created_at?: string }
        | { first_name?: string; last_name?: string; created_at?: string }[]
        | null
    );
    const protocol = firstRel(
      row.protocols as { code_name?: string } | { code_name?: string }[] | null
    );
    return {
      id: row.id,
      patient_id: row.patient_id,
      protocol_id: row.protocol_id,
      status: row.status as ScreeningStatus,
      created_at: row.created_at,
      patientCreatedAt: patient?.created_at ?? null,
      patientName: patientName(patient),
      protocolCode: protocol?.code_name ?? "—",
    };
  });

  const visits: FunnelVisit[] = visitRows.map((row) => ({
    ...row,
    status: row.status as VisitStatus,
  }));

  return computeSiteFunnel({
    submissions: submissionRows,
    visits,
    screenings,
    pendingItems,
  });
}

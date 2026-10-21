import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import { addDays, patientLabel, startOfDay, type VisitRow } from "@/lib/ops/visits";
import type {
  ClinicalProfile,
  MatchVerdict,
  Patient,
  Protocol,
} from "@/lib/types";

export type MorningGap = "eligible" | "pending" | "excluded" | "no_chart" | "no_protocols";

/** Una cita de mañana y el protocolo activo que mejor le queda. */
export interface MorningListItem {
  visitId: string;
  patientId: string;
  scheduledAt: string;
  patientName: string;
  protocolId: string | null;
  protocolCode: string | null;
  gap: MorningGap;
  /**
   * Nombre del criterio del protocolo (inclusión que falta o criterio que no se cumple).
   * Nunca un valor, una nota ni una cita del expediente.
   */
  criterion: string | null;
}

const VERDICT_RANK: Record<MatchVerdict, number> = {
  eligible: 0,
  pending: 1,
  excluded: 2,
};

export function tomorrowWindow(now: Date): { start: Date; end: Date } {
  const start = addDays(startOfDay(now), 1);
  return { start, end: addDays(start, 1) };
}

export function isTomorrowScheduled(visit: VisitRow, now: Date): boolean {
  if (visit.status !== "scheduled") return false;
  const at = new Date(visit.scheduled_at).getTime();
  if (Number.isNaN(at)) return false;
  const { start, end } = tomorrowWindow(now);
  return at >= start.getTime() && at < end.getTime();
}

function criterionNamed(
  details: { status: string; criterion: string }[],
  status: "missing" | "fail"
): string | null {
  return details.find((detail) => detail.status === status)?.criterion ?? null;
}

/**
 * Citas programadas de mañana (hora local), una fila por cita.
 * Elige el protocolo activo con mejor veredicto y, a igualdad, mayor puntaje.
 * Si el paciente no está en el registro, no inventa un encaje.
 */
export function buildMorningList(input: {
  visits: VisitRow[];
  pairs: { patient: Patient; profile: ClinicalProfile | null }[];
  protocols: Protocol[];
  now: Date;
}): MorningListItem[] {
  const active = input.protocols.filter((protocol) => protocol.status === "active");
  const byPatient = new Map(input.pairs.map((pair) => [pair.patient.id, pair]));

  return input.visits
    .filter((visit) => isTomorrowScheduled(visit, input.now))
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() ||
        a.id.localeCompare(b.id)
    )
    .map((visit) => {
      const base = {
        visitId: visit.id,
        patientId: visit.patient_id,
        scheduledAt: visit.scheduled_at,
        patientName: patientLabel(visit.patient),
      };
      if (active.length === 0) {
        return {
          ...base,
          protocolId: null,
          protocolCode: null,
          gap: "no_protocols" as const,
          criterion: null,
        };
      }
      const pair = byPatient.get(visit.patient_id);
      if (!pair) {
        return {
          ...base,
          protocolId: null,
          protocolCode: null,
          gap: "no_chart" as const,
          criterion: null,
        };
      }

      const ranked = active
        .map((protocol) => ({
          protocol,
          result: evaluatePatientAgainstProtocol(pair.patient, pair.profile, protocol),
        }))
        .sort(
          (a, b) =>
            VERDICT_RANK[a.result.verdict] - VERDICT_RANK[b.result.verdict] ||
            b.result.score - a.result.score ||
            a.protocol.code_name.localeCompare(b.protocol.code_name)
        );
      const best = ranked[0];
      const criterion =
        best.result.verdict === "pending"
          ? criterionNamed(best.result.details, "missing")
          : best.result.verdict === "excluded"
            ? criterionNamed(best.result.details, "fail")
            : null;
      return {
        ...base,
        protocolId: best.protocol.id,
        protocolCode: best.protocol.code_name,
        gap: best.result.verdict,
        criterion,
      };
    });
}

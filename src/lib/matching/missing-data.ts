import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import { findLabEvidence } from "@/lib/matching/aliases";
import type { ClinicalProfile, Patient, Protocol } from "@/lib/types";
import { normalizeTerm } from "@/lib/utils";

export type GapKind = "profile" | "lab";

/** Un dato o estudio que falta y los protocolos que destraba. */
export interface GapItem {
  key: string;
  kind: GapKind;
  label: string;
  /** Protocolos activos donde este dato falta y nada más lo bloquea de forma dura. */
  protocols: { id: string; code: string }[];
  /** Protocolos donde este es el único dato pendiente. */
  closes: number;
}

const PROFILE_KEY = "profile";
const PROFILE_LABEL = "Ficha clínica";

function labKey(name: string): string {
  return `lab:${normalizeTerm(name)}`;
}

function missingForProtocol(
  patient: Patient,
  profile: ClinicalProfile | null,
  protocol: Protocol
): { key: string; kind: GapKind; label: string }[] | null {
  const result = evaluatePatientAgainstProtocol(patient, profile, protocol);
  if (result.verdict !== "pending") return null;

  if (!profile) return [{ key: PROFILE_KEY, kind: "profile", label: PROFILE_LABEL }];

  const labs = new Map<string, number>(
    Object.entries(profile.laboratories ?? {}).map(([k, v]) => [normalizeTerm(k), Number(v)])
  );
  const items: { key: string; kind: GapKind; label: string }[] = [];
  for (const lab of protocol.inclusion_criteria?.required_labs ?? []) {
    const found = findLabEvidence(labs, lab.name);
    if (!found || Number.isNaN(found.value)) {
      items.push({ key: labKey(lab.name), kind: "lab", label: lab.name });
    }
  }
  return items;
}

/**
 * Qué le falta a un paciente para calificar, ordenado por impacto.
 * Solo cuenta protocolos activos donde ningún criterio duro lo descarta.
 * Primero van los datos que cierran más protocolos por sí solos.
 */
export function buildPatientGaps(
  pair: { patient: Patient; profile: ClinicalProfile | null },
  protocols: Protocol[]
): GapItem[] {
  const byKey = new Map<string, GapItem>();

  for (const protocol of protocols) {
    if (protocol.status !== "active") continue;
    const missing = missingForProtocol(pair.patient, pair.profile, protocol);
    if (!missing || missing.length === 0) continue;

    const unique = new Map(missing.map((item) => [item.key, item]));
    for (const item of unique.values()) {
      const entry = byKey.get(item.key) ?? {
        key: item.key,
        kind: item.kind,
        label: item.label,
        protocols: [],
        closes: 0,
      };
      entry.protocols.push({ id: protocol.id, code: protocol.code_name });
      if (unique.size === 1) entry.closes += 1;
      byKey.set(item.key, entry);
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      b.closes - a.closes ||
      b.protocols.length - a.protocols.length ||
      a.label.localeCompare(b.label)
  );
}

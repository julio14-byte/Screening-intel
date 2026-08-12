import type {
  ClinicalProfile,
  CriterionResult,
  MatchResult,
  MatchVerdict,
  Patient,
  Protocol,
} from "./types";
import { calculateAge, GENDER_LABELS, normalizeTerm } from "./utils";

/**
 * Motor de reglas de elegibilidad.
 *
 * Evalúa a un paciente contra los criterios de inclusión/exclusión de un
 * protocolo y devuelve:
 *  - verdict: "eligible" (🟢 cumple todo), "pending" (🟡 falta información)
 *    o "excluded" (🔴 activa una exclusión o falla un criterio duro).
 *  - score: % de criterios superados sobre el total de criterios evaluados.
 *  - details: resultado criterio por criterio para trazabilidad.
 */
export function evaluatePatientAgainstProtocol(
  patient: Patient,
  profile: ClinicalProfile | null,
  protocol: Protocol
): MatchResult {
  const details: CriterionResult[] = [];
  const inclusion = protocol.inclusion_criteria ?? {};
  const exclusion = protocol.exclusion_criteria ?? {};

  const conditions = (profile?.conditions ?? []).map(normalizeTerm);
  const medications = (profile?.medications ?? []).map(normalizeTerm);
  const labs = profile?.laboratories ?? {};
  const normalizedLabs = new Map<string, number>(
    Object.entries(labs).map(([k, v]) => [normalizeTerm(k), Number(v)])
  );

  // --- Inclusión: edad -------------------------------------------------------
  const age = calculateAge(patient.birth_date);
  const hasAgeRule = inclusion.min_age != null || inclusion.max_age != null;
  if (hasAgeRule) {
    const min = inclusion.min_age ?? -Infinity;
    const max = inclusion.max_age ?? Infinity;
    const label = `Edad ${inclusion.min_age ?? "–"} a ${inclusion.max_age ?? "–"} años`;
    details.push({
      type: "inclusion",
      criterion: label,
      status: age >= min && age <= max ? "pass" : "fail",
      detail: `El paciente tiene ${age} años`,
    });
  }

  // --- Inclusión: sexo -------------------------------------------------------
  if (inclusion.gender && inclusion.gender !== "any") {
    const pass = patient.gender === inclusion.gender;
    details.push({
      type: "inclusion",
      criterion: `Sexo requerido: ${GENDER_LABELS[inclusion.gender]}`,
      status: pass ? "pass" : "fail",
      detail: `Sexo del paciente: ${GENDER_LABELS[patient.gender]}`,
    });
  }

  // --- Inclusión: condiciones requeridas ------------------------------------
  for (const required of inclusion.required_conditions ?? []) {
    const target = normalizeTerm(required);
    if (!profile) {
      details.push({
        type: "inclusion",
        criterion: `Diagnóstico requerido: ${required}`,
        status: "missing",
        detail: "El paciente no tiene perfil clínico cargado",
      });
      continue;
    }
    const pass = conditions.some(
      (c) => c.includes(target) || target.includes(c)
    );
    details.push({
      type: "inclusion",
      criterion: `Diagnóstico requerido: ${required}`,
      status: pass ? "pass" : "fail",
      detail: pass
        ? "Presente en el perfil clínico"
        : "No figura entre las condiciones del paciente",
    });
  }

  // --- Inclusión: laboratorios con rango -------------------------------------
  for (const lab of inclusion.required_labs ?? []) {
    const range = [
      lab.min != null ? `≥ ${lab.min}` : null,
      lab.max != null ? `≤ ${lab.max}` : null,
    ]
      .filter(Boolean)
      .join(" y ");
    const label = `Lab ${lab.name} ${range}${lab.unit ? ` ${lab.unit}` : ""}`;
    const value = normalizedLabs.get(normalizeTerm(lab.name));

    if (value == null || Number.isNaN(value)) {
      details.push({
        type: "inclusion",
        criterion: label,
        status: "missing",
        detail: `Sin resultado de ${lab.name} cargado`,
      });
      continue;
    }
    const pass =
      (lab.min == null || value >= lab.min) &&
      (lab.max == null || value <= lab.max);
    details.push({
      type: "inclusion",
      criterion: label,
      status: pass ? "pass" : "fail",
      detail: `Valor registrado: ${value}${lab.unit ? ` ${lab.unit}` : ""}`,
    });
  }

  // --- Exclusión: condiciones prohibidas -------------------------------------
  for (const excluded of exclusion.excluded_conditions ?? []) {
    const target = normalizeTerm(excluded);
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Condición excluyente: ${excluded}`,
        status: "missing",
        detail: "Sin perfil clínico para verificar",
      });
      continue;
    }
    const triggered = conditions.some(
      (c) => c.includes(target) || target.includes(c)
    );
    details.push({
      type: "exclusion",
      criterion: `Condición excluyente: ${excluded}`,
      status: triggered ? "fail" : "pass",
      detail: triggered
        ? "El paciente presenta esta condición"
        : "No presenta esta condición",
    });
  }

  // --- Exclusión: medicamentos prohibidos -------------------------------------
  for (const excluded of exclusion.excluded_medications ?? []) {
    const target = normalizeTerm(excluded);
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Medicación excluyente: ${excluded}`,
        status: "missing",
        detail: "Sin perfil clínico para verificar",
      });
      continue;
    }
    const triggered = medications.some(
      (m) => m.includes(target) || target.includes(m)
    );
    details.push({
      type: "exclusion",
      criterion: `Medicación excluyente: ${excluded}`,
      status: triggered ? "fail" : "pass",
      detail: triggered
        ? "El paciente la recibe actualmente"
        : "No la recibe actualmente",
    });
  }

  // --- Veredicto y score ------------------------------------------------------
  const total = details.length;
  const passed = details.filter((d) => d.status === "pass").length;
  const hasExclusionTriggered = details.some(
    (d) => d.type === "exclusion" && d.status === "fail"
  );
  const hasInclusionFail = details.some(
    (d) => d.type === "inclusion" && d.status === "fail"
  );
  const hasMissing = details.some((d) => d.status === "missing");

  let verdict: MatchVerdict;
  if (hasExclusionTriggered || hasInclusionFail) {
    verdict = "excluded";
  } else if (hasMissing || !profile) {
    verdict = "pending";
  } else {
    verdict = "eligible";
  }

  const score = total === 0 ? 100 : Math.round((passed / total) * 100);

  return { patient, profile, verdict, score, details };
}

/**
 * Evalúa toda la base de pacientes contra un protocolo y devuelve los
 * resultados ordenados: elegibles primero, luego pendientes, luego excluidos,
 * y dentro de cada grupo por score descendente.
 */
export function rankPatientsForProtocol(
  patients: { patient: Patient; profile: ClinicalProfile | null }[],
  protocol: Protocol
): MatchResult[] {
  const verdictOrder: Record<MatchVerdict, number> = {
    eligible: 0,
    pending: 1,
    excluded: 2,
  };
  return patients
    .map(({ patient, profile }) =>
      evaluatePatientAgainstProtocol(patient, profile, protocol)
    )
    .sort(
      (a, b) =>
        verdictOrder[a.verdict] - verdictOrder[b.verdict] || b.score - a.score
    );
}

import type {
  ClinicalProfile,
  CriterionResult,
  MatchResult,
  MatchVerdict,
  Patient,
  Protocol,
} from "./types";
import {
  findLabValue,
  someTermMatches,
} from "./matching/clinicalTerms";
import { calculateAge, GENDER_LABELS } from "./utils";

/**
 * Motor de reglas de elegibilidad.
 *
 * Evalúa a un paciente contra los criterios de inclusión/exclusión de un
 * protocolo y devuelve:
 *  - verdict: "eligible" (🟢 cumple todo), "pending" (🟡 falta información)
 *    o "excluded" (🔴 activa una exclusión o falla un criterio duro).
 *  - score: % de criterios superados sobre el total de criterios evaluados.
 *  - details: resultado criterio por criterio para trazabilidad.
 *
 * Los criterios se comparan con sinónimos clínicos ES/EN (p. ej.
 * "type 2 diabetes mellitus" ↔ "diabetes tipo 2") sin reescribir el texto
 * del protocolo.
 */
export function evaluatePatientAgainstProtocol(
  patient: Patient,
  profile: ClinicalProfile | null,
  protocol: Protocol
): MatchResult {
  const details: CriterionResult[] = [];
  const inclusion = protocol.inclusion_criteria ?? {};
  const exclusion = protocol.exclusion_criteria ?? {};

  const conditions = profile?.conditions ?? [];
  const medications = profile?.medications ?? [];
  const labs = profile?.laboratories ?? {};

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
    if (!profile) {
      details.push({
        type: "inclusion",
        criterion: `Diagnóstico requerido: ${required}`,
        status: "missing",
        detail: "El paciente no tiene perfil clínico cargado",
      });
      continue;
    }
    const pass = someTermMatches(conditions, required, "condition");
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
    const value = findLabValue(labs, lab.name);

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
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Condición excluyente: ${excluded}`,
        status: "missing",
        detail: "Sin perfil clínico para verificar",
      });
      continue;
    }
    const triggered = someTermMatches(conditions, excluded, "condition");
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
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Medicación excluyente: ${excluded}`,
        status: "missing",
        detail: "Sin perfil clínico para verificar",
      });
      continue;
    }
    const triggered = someTermMatches(medications, excluded, "medication");
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
 * Pre-filtro para portal de candidatos: sin laboratorios (el paciente no los trae).
 * Labs se evalúan en visita de screening dentro de la app.
 */
export function evaluatePatientIntake(
  patient: Patient,
  profile: ClinicalProfile | null,
  protocol: Protocol
): MatchResult {
  const full = evaluatePatientAgainstProtocol(patient, profile, protocol);
  const details = full.details.filter(
    (d) => !d.criterion.toLowerCase().startsWith("lab ")
  );

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

  return {
    patient: full.patient,
    profile: full.profile,
    verdict,
    score,
    details,
  };
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

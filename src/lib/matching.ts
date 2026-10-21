import type {
  ClinicalProfile,
  CriterionResult,
  MatchResult,
  MatchVerdict,
  Patient,
  Protocol,
} from "./types";
import { calculateAge, GENDER_LABELS, normalizeTerm } from "./utils";
import {
  findLabEvidence,
  findMatchingTerms,
} from "./matching/aliases";

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

  const conditions = profile?.conditions ?? [];
  const medications = profile?.medications ?? [];
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
    const agePass = age >= min && age <= max;
    details.push({
      type: "inclusion",
      criterion: label,
      status: agePass ? "pass" : "fail",
      detail: agePass
        ? `La edad calculada (${age} años) cae dentro del rango.`
        : `La edad calculada (${age} años) queda fuera del rango.`,
      evidence: [`Fecha de nacimiento ${patient.birth_date} (${age} años)`],
    });
  }

  // --- Inclusión: sexo -------------------------------------------------------
  if (inclusion.gender && inclusion.gender !== "any") {
    const pass = patient.gender === inclusion.gender;
    details.push({
      type: "inclusion",
      criterion: `Sexo biológico requerido: ${GENDER_LABELS[inclusion.gender]}`,
      status: pass ? "pass" : "fail",
      detail: pass
        ? "El sexo registrado coincide con el criterio."
        : "El sexo registrado no coincide con el criterio.",
      evidence: [`Sexo registrado: ${GENDER_LABELS[patient.gender]}`],
    });
  }

  // --- Inclusión: condiciones requeridas ------------------------------------
  for (const required of inclusion.required_conditions ?? []) {
    if (!profile) {
      details.push({
        type: "inclusion",
        criterion: `Diagnóstico requerido: ${required}`,
        status: "missing",
        detail: "No hay perfil clínico para citar evidencia.",
        evidence: [],
      });
      continue;
    }
    const hits = findMatchingTerms(conditions, required);
    details.push({
      type: "inclusion",
      criterion: `Diagnóstico requerido: ${required}`,
      status: hits.length > 0 ? "pass" : "fail",
      detail:
        hits.length > 0
          ? "Hay un término compatible en las condiciones del perfil."
          : "Ninguna condición del perfil es compatible con este criterio.",
      evidence: hits,
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
    const found = findLabEvidence(normalizedLabs, lab.name);

    if (!found || Number.isNaN(found.value)) {
      details.push({
        type: "inclusion",
        criterion: label,
        status: "missing",
        detail: `No hay un resultado de ${lab.name} en los laboratorios del perfil.`,
        evidence: [],
      });
      continue;
    }
    const pass =
      (lab.min == null || found.value >= lab.min) &&
      (lab.max == null || found.value <= lab.max);
    details.push({
      type: "inclusion",
      criterion: label,
      status: pass ? "pass" : "fail",
      detail: pass
        ? "El valor citado cae dentro del rango."
        : "El valor citado queda fuera del rango.",
      evidence: [
        `${found.key}: ${found.value}${lab.unit ? ` ${lab.unit}` : ""}`,
      ],
    });
  }

  // --- Exclusión: condiciones prohibidas -------------------------------------
  for (const excluded of exclusion.excluded_conditions ?? []) {
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Condición excluyente: ${excluded}`,
        status: "missing",
        detail: "No hay perfil clínico para citar evidencia.",
        evidence: [],
      });
      continue;
    }
    const hits = findMatchingTerms(conditions, excluded);
    details.push({
      type: "exclusion",
      criterion: `Condición excluyente: ${excluded}`,
      status: hits.length > 0 ? "fail" : "pass",
      detail:
        hits.length > 0
          ? "El perfil lista un término compatible con esta exclusión."
          : "El perfil cargado no lista un término compatible. Eso no prueba que la condición no exista fuera de este expediente.",
      evidence: hits,
    });
  }

  // --- Exclusión: medicamentos prohibidos -------------------------------------
  for (const excluded of exclusion.excluded_medications ?? []) {
    if (!profile) {
      details.push({
        type: "exclusion",
        criterion: `Medicación excluyente: ${excluded}`,
        status: "missing",
        detail: "No hay perfil clínico para citar evidencia.",
        evidence: [],
      });
      continue;
    }
    const hits = findMatchingTerms(medications, excluded);
    details.push({
      type: "exclusion",
      criterion: `Medicación excluyente: ${excluded}`,
      status: hits.length > 0 ? "fail" : "pass",
      detail:
        hits.length > 0
          ? "El perfil lista un medicamento compatible con esta exclusión."
          : "El perfil cargado no lista un medicamento compatible. Eso no prueba que no lo reciba fuera de este expediente.",
      evidence: hits,
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

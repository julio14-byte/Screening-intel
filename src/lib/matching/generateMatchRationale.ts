import { chatCompletion } from "@/lib/ai/openai";
import { redactIdentifiers } from "@/lib/privacy/redact";
import type {
  CriterionResult,
  Gender,
  MatchVerdict,
} from "@/lib/types";
import { calculateAge, GENDER_LABELS, toPatientInitials } from "@/lib/utils";

export type MatchRationaleInput = {
  protocol: { code_name: string; title: string };
  patient: {
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: Gender;
  };
  verdict: MatchVerdict;
  score: number;
  details: CriterionResult[];
  /** Contexto opcional para re-match vs matching directo. */
  context?: "match" | "rematch";
};

const VERDICT_LABELS: Record<MatchVerdict, string> = {
  eligible: "Cumple (elegible)",
  pending: "Pendiente (falta información)",
  excluded: "No cumple (excluido)",
};

/** Genera texto explicativo del matching a partir de match_details (gpt-4o-mini). */
export async function generateMatchRationale(
  input: MatchRationaleInput
): Promise<string> {
  if (!input.details.length) {
    return (
      `El protocolo ${input.protocol.code_name} no tiene criterios definidos. ` +
      `No es posible generar una justificación clínica detallada.`
    );
  }

  const payload = {
    contexto: input.context ?? "match",
    protocolo: {
      codigo: input.protocol.code_name,
      titulo: input.protocol.title,
    },
    paciente: {
      iniciales: toPatientInitials(
        input.patient.first_name,
        input.patient.last_name
      ),
      edad_anios: calculateAge(input.patient.birth_date),
      sexo: GENDER_LABELS[input.patient.gender],
    },
    veredicto_motor: VERDICT_LABELS[input.verdict],
    score_porcentaje: input.score,
    criterios: input.details.map((d) => ({
      tipo: d.type === "inclusion" ? "inclusion" : "exclusion",
      criterio: d.criterion,
      estado:
        d.status === "pass"
          ? "cumple"
          : d.status === "fail"
            ? "no_cumple"
            : "faltante",
      detalle: d.detail,
      evidencia: (d.evidence ?? []).map((e) => redactIdentifiers(e).text),
    })),
  };

  const content = await chatCompletion({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente clínico de Crisvia para clinical research sites. " +
          "Explica en español latinoamericano el resultado del motor de matching usando SOLO el JSON provisto. " +
          "NO cambies el veredicto, NO inventes datos clínicos ni valores de laboratorio. " +
          "Cita los criterios y, si el JSON trae 'evidencia', cita ese texto del expediente. " +
          "Si 'evidencia' está vacía, di que no hay evidencia cargada para ese criterio. " +
          "Identifica al paciente solo por iniciales; nunca escribas un nombre completo. " +
          "Si un criterio está en 'faltante', indica qué falta cargar. " +
          "Si contexto es 'rematch', menciona brevemente que es una evaluación para un protocolo alternativo tras screen failure. " +
          "Formato: 1 párrafo breve (2-4 oraciones) con el veredicto y motivo principal; " +
          "luego hasta 5 viñetas con los criterios más relevantes (fallas o pendientes primero). " +
          "Tono profesional para coordinadores de estudios.",
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
  });

  return content;
}

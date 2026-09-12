import type { CriterionResult, Gender, MatchVerdict } from "@/lib/types";
import { calculateAge, GENDER_LABELS } from "@/lib/utils";

export type RematchCompareFailure = {
  protocol_code: string;
  score: number;
};

export type RematchCompareAlternative = {
  protocol: { code_name: string; title: string };
  verdict: MatchVerdict;
  score: number;
  details: CriterionResult[];
};

export type RematchCompareInput = {
  patient: {
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: Gender;
  };
  failures: RematchCompareFailure[];
  alternatives: RematchCompareAlternative[];
};

const STATUS_RANK: Record<CriterionResult["status"], number> = {
  fail: 0,
  missing: 1,
  pass: 2,
};

const MAX_ALTERNATIVES = 5;
const MAX_CRITERIA = 8;

function compactDetails(details: CriterionResult[]): CriterionResult[] {
  return [...details]
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
    .slice(0, MAX_CRITERIA);
}

/** Compara protocolos alternativos tras un screen failure (gpt-4o-mini). */
export async function generateRematchCompare(
  input: RematchCompareInput
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  if (!input.alternatives.length) {
    return (
      "No hay protocolos activos alternativos para comparar. " +
      "Revisá el perfil clínico o esperá un protocolo nuevo."
    );
  }

  const payload = {
    paciente: {
      iniciales: `${input.patient.last_name.slice(0, 1)}. ${input.patient.first_name.slice(0, 1)}.`,
      edad_anios: calculateAge(input.patient.birth_date),
      sexo: GENDER_LABELS[input.patient.gender],
    },
    screen_failure_en: input.failures.map((f) => ({
      protocolo: f.protocol_code,
      score: f.score,
    })),
    alternativas: input.alternatives.slice(0, MAX_ALTERNATIVES).map((a) => ({
      protocolo: a.protocol.code_name,
      titulo: a.protocol.title,
      veredicto_motor: a.verdict,
      score: a.score,
      criterios: compactDetails(a.details).map((d) => ({
        tipo: d.type,
        criterio: d.criterion,
        estado: d.status,
        detalle: d.detail,
      })),
    })),
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Sos un coordinador de estudios de Screenlane. " +
            "El paciente tuvo screen failure y hay que elegir el próximo protocolo a llamar. " +
            "Usá SOLO el JSON. NO inventes criterios, labs ni diagnósticos. " +
            "NO cambies los veredictos ni los scores del motor. " +
            "No uses el nombre completo: las iniciales ya vienen en el JSON. " +
            "Formato en español: " +
            "1) 2-4 oraciones: qué protocolo priorizar y por qué, frente a los screen failure; " +
            "2) hasta 5 viñetas: orden de llamada o qué dato falta para pasar de pendiente a elegible. " +
            "Si hay empate, preferí eligible sobre pending. Tono operativo, no médico prescriptivo.",
        },
        {
          role: "user",
          content: JSON.stringify(payload, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI no devolvió la comparación.");
  }

  return content;
}

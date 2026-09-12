import type { Gender } from "@/lib/types";
import { calculateAge, GENDER_LABELS } from "@/lib/utils";

export type CandidatoTriageMatch = {
  protocol_code: string;
  protocol_title?: string;
  verdict: string;
  score: number;
};

export type CandidatoTriageInput = {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  conditions: string[];
  medications: string[];
  laboratories?: Record<string, number>;
  raw_notes: string | null;
  matches: CandidatoTriageMatch[];
};

const NOTES_CAP = 2000;

/** Resume un lead del portal para la llamada de pre-screening (gpt-4o-mini). */
export async function generateCandidatoTriage(
  input: CandidatoTriageInput
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const notes = input.raw_notes?.trim()
    ? input.raw_notes.trim().slice(0, NOTES_CAP)
    : null;

  const payload = {
    candidato: {
      iniciales: `${input.last_name.slice(0, 1)}. ${input.first_name.slice(0, 1)}.`,
      edad_anios: calculateAge(input.birth_date),
      sexo: GENDER_LABELS[input.gender],
    },
    perfil: {
      condiciones: input.conditions,
      medicacion: input.medications,
      laboratorios: input.laboratories ?? {},
    },
    notas_libres: notes,
    matching_motor: input.matches.map((m) => ({
      protocolo: m.protocol_code,
      titulo: m.protocol_title ?? null,
      veredicto: m.verdict,
      score: m.score,
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
            "Preparás un briefing de 30 segundos para la llamada de pre-screening. " +
            "Usá SOLO el JSON. NO inventes diagnósticos, labs ni criterios. " +
            "NO cambies los veredictos del motor de matching. " +
            "No uses el nombre completo: las iniciales ya vienen en el JSON. " +
            "Formato en español: " +
            "1) 2-4 oraciones con el panorama clínico y el protocolo más prometedor según el motor; " +
            "2) hasta 4 viñetas: qué confirmar en la llamada (datos faltantes o exclusiones). " +
            "Si no hay matching, decí que hay que cargar más perfil antes de priorizar un protocolo.",
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
    throw new Error("OpenAI no devolvió el triage.");
  }

  return content;
}

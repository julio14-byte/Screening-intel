import { withComputedBmi } from "@/lib/profile/clinical-measurements";

export type ExtractedClinicalProfileDraft = {
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
};

const EXTRACTION_SCHEMA = `{
  "conditions": string[] — diagnósticos o patologías activas en español,
  "medications": string[] — medicación concomitante actual,
  "laboratories": { "nombre_lab": number } — mediciones recientes con estas claves si aparecen:
    pas, pad (mmHg), frecuencia_cardiaca (lpm), temperatura (°C), frecuencia_respiratoria (rpm),
    peso (kg), estatura (cm), imc,
    glucosa (mg/dL), creatinina (mg/dL), tgo, tgp, ggt, fa (U/L),
    hemoglobina (g/dL), hematocrito (%), leucocitos, plaquetas,
    embarazo_sangre y embarazo_orina (0 = negativo, 1 = positivo).
    Si figura presión 120/80, usá pas=120 y pad=80.
}`;

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeLabs(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const name = key.trim().toLowerCase();
    const num = typeof raw === "number" ? raw : Number(raw);
    if (name && Number.isFinite(num)) out[name] = num;
  }
  return out;
}

/** Extrae perfil clínico estructurado desde notas libres (GPT-4o-mini). */
export async function extractClinicalProfileFromNotes(
  notes: string
): Promise<ExtractedClinicalProfileDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada para extracción NLP.");
  }

  const trimmed = notes.trim().slice(0, 8000);
  if (!trimmed) {
    throw new Error("Las notas clínicas están vacías.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente clínico para clinical research sites. Extraé de notas en español " +
            "condiciones, medicación, signos vitales, antropometría y laboratorios. " +
            "Usá las claves canónicas del esquema (pas/pad, glucosa, creatinina, tgo, tgp, etc.). " +
            "No inventes datos que no estén en el texto. " +
            "Respondé SOLO JSON válido con esta forma:\n" +
            EXTRACTION_SCHEMA,
        },
        {
          role: "user",
          content: "Extraé el perfil clínico de estas notas:\n\n" + trimmed,
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

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI no devolvió contenido.");

  const parsed = JSON.parse(content) as Partial<ExtractedClinicalProfileDraft>;

  return {
    conditions: normalizeStringList(parsed.conditions),
    medications: normalizeStringList(parsed.medications),
    laboratories: withComputedBmi(normalizeLabs(parsed.laboratories)),
  };
}

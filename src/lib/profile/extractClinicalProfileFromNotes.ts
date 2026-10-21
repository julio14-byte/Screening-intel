import { chatCompletion } from "@/lib/ai/openai";
import { redactIdentifiers } from "@/lib/privacy/redact";
import { withComputedBmi } from "@/lib/profile/clinical-measurements";
import {
  emptyAnamnesis,
  hydrateAnamnesis,
  type ClinicalAnamnesis,
} from "@/lib/profile/anamnesis";

export type ExtractedClinicalProfileDraft = {
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
  anamnesis: ClinicalAnamnesis;
};

const EXTRACTION_SCHEMA = `{
  "conditions": string[] — nombres de diagnósticos / enfermedades crónicas,
  "medications": string[] — nombres de fármacos, vitaminas o suplementos,
  "laboratories": { "nombre_lab": number } — mediciones (pas, pad, glucosa, creatinina, tgo, tgp, etc.),
  "anamnesis": {
    "diagnoses": [{ "name", "diagnosed_at": "YYYY-MM-DD", "symptoms", "severity": "leve"|"moderada"|"grave"| "", "evolution" }],
    "surgeries": string,
    "hospitalizations": string,
    "medications": [{ "name", "kind": "farmaco"|"vitamina"|"suplemento"|"herbolario", "dose", "schedule", "status": "current"|"recent" }],
    "allergies": [{ "substance", "category": "medicamento"|"alimento"|"quimico"|"otra", "reaction" }]
  }
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
  notes: string,
  options: { knownNames?: string[] } = {}
): Promise<ExtractedClinicalProfileDraft> {
  const { text: trimmed } = redactIdentifiers(notes.trim().slice(0, 8000), {
    names: options.knownNames,
  });
  if (!trimmed) {
    throw new Error("Las notas clínicas están vacías.");
  }

  const content = await chatCompletion({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Sos un asistente clínico para clinical research sites. Extraé anamnesis de notas en español: " +
          "diagnósticos (fecha, síntomas, gravedad, evolución), cirugías, hospitalizaciones, " +
          "medicación con dosis y horario, alergias, signos vitales y laboratorios. " +
          "No inventes datos que no estén en el texto. " +
          "Respondé SOLO JSON válido con esta forma:\n" +
          EXTRACTION_SCHEMA,
      },
      {
        role: "user",
        content: "Extraé el perfil clínico de estas notas:\n\n" + trimmed,
      },
    ],
  });

  const parsed = JSON.parse(content) as Partial<ExtractedClinicalProfileDraft>;
  const conditions = normalizeStringList(parsed.conditions);
  const medications = normalizeStringList(parsed.medications);

  return {
    conditions,
    medications,
    laboratories: withComputedBmi(normalizeLabs(parsed.laboratories)),
    anamnesis: hydrateAnamnesis({
      anamnesis: parsed.anamnesis ?? emptyAnamnesis(),
      conditions,
      medications,
    }),
  };
}

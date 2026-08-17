import { extractText, getDocumentProxy } from "unpdf";
import type { ExclusionCriteria, InclusionCriteria } from "@/lib/types";

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

export type ExtractedProtocolDraft = {
  title: string;
  code_name: string;
  inclusion_criteria: InclusionCriteria;
  exclusion_criteria: ExclusionCriteria;
};

const EXTRACTION_SCHEMA = `{
  "title": "string — título del estudio",
  "code_name": "string — código corto tipo ABC-123",
  "inclusion_criteria": {
    "min_age": number | null,
    "max_age": number | null,
    "gender": "any" | "male" | "female",
    "required_conditions": string[],
    "required_labs": [{ "name": string, "min": number | null, "max": number | null, "unit": string }]
  },
  "exclusion_criteria": {
    "excluded_conditions": string[],
    "excluded_medications": string[]
  }
}`;

export async function extractProtocolCriteriaFromText(
  text: string
): Promise<ExtractedProtocolDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada para extracción NLP.");
  }

  const trimmed = text.slice(0, 12000);
  if (!trimmed) {
    throw new Error("No se encontró texto en el documento.");
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
            "Extraé criterios de inclusión y exclusión de protocolos clínicos en español. " +
            "Respondé SOLO JSON válido con esta forma:\n" +
            EXTRACTION_SCHEMA,
        },
        {
          role: "user",
          content:
            "Extraé título, código sugerido y criterios estructurados de este protocolo:\n\n" +
            trimmed,
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

  const parsed = JSON.parse(content) as ExtractedProtocolDraft;

  return {
    title: parsed.title || "Protocolo importado",
    code_name: parsed.code_name || "IMPORT-001",
    inclusion_criteria: {
      min_age: parsed.inclusion_criteria?.min_age ?? null,
      max_age: parsed.inclusion_criteria?.max_age ?? null,
      gender: parsed.inclusion_criteria?.gender ?? "any",
      required_conditions: parsed.inclusion_criteria?.required_conditions ?? [],
      required_labs: parsed.inclusion_criteria?.required_labs ?? [],
    },
    exclusion_criteria: {
      excluded_conditions: parsed.exclusion_criteria?.excluded_conditions ?? [],
      excluded_medications: parsed.exclusion_criteria?.excluded_medications ?? [],
    },
  };
}

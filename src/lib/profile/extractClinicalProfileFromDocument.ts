import { extractTextFromPdf } from "@/lib/documents/pdfText";
import {
  CLINICAL_PROFILE_EXTRACTION_SCHEMA,
  parseExtractedProfileDraft,
  type ExtractedClinicalProfileDraft,
} from "@/lib/profile/extractClinicalProfileFromNotes";

export type ExpedienteDocumentKind = "lab" | "prescription" | "auto";

const MIN_PDF_TEXT_CHARS = 40;
const PDF_TEXT_LIMIT = 12000;
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const PDF_MAX_BYTES = 8 * 1024 * 1024;

const KIND_HINT: Record<ExpedienteDocumentKind, string> = {
  lab:
    "El documento es un resultado de laboratorio. Prioriza valores numéricos " +
    "(glucosa, hba1c, creatinina, hemoglobina, etc.) con el nombre de la prueba en minúsculas. " +
    "Incluye medicación o diagnósticos solo si aparecen escritos.",
  prescription:
    "El documento es una receta médica (puede ser una fotografía). Prioriza medicación concomitante " +
    "(nombre genérico; si hay dosis, incorpórala en el mismo string, ej. 'metformina 850 mg'). " +
    "Incluye diagnósticos solo si están escritos. Labs solo si hay un valor numérico explícito.",
  auto:
    "Detecta si es laboratorio, receta u otro documento clínico. Extrae lo que esté escrito: " +
    "condiciones, medicación y laboratorios numéricos.",
};

function systemPrompt(kind: ExpedienteDocumentKind): string {
  return (
    "Eres un asistente clínico para clinical research sites. " +
    "Extrae al expediente de screening SOLO condiciones, medicación y laboratorios numéricos. " +
    "No copies nombres de pacientes, DNI, direcciones, teléfonos ni firmas. " +
    "No inventes valores que no se vean o no estén escritos. " +
    "No decidas elegibilidad. " +
    KIND_HINT[kind] +
    " Responde SOLO JSON válido con esta forma:\n" +
    CLINICAL_PROFILE_EXTRACTION_SCHEMA
  );
}

async function completeJson(
  messages: unknown[]
): Promise<ExtractedClinicalProfileDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada para extracción NLP.");
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
      messages,
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
  return parseExtractedProfileDraft(content);
}

export async function extractClinicalProfileFromPdfBuffer(
  buffer: ArrayBuffer,
  kind: ExpedienteDocumentKind
): Promise<{ draft: ExtractedClinicalProfileDraft; textLength: number }> {
  if (buffer.byteLength > PDF_MAX_BYTES) {
    throw new Error("El PDF supera 8 MB.");
  }

  const text = (await extractTextFromPdf(buffer)).slice(0, PDF_TEXT_LIMIT);
  if (text.length < MIN_PDF_TEXT_CHARS) {
    throw new Error(
      "Este PDF no tiene texto seleccionable (suele ser un escaneo). " +
        "Fotografía las páginas con «Tomar foto» o sube una imagen JPEG/PNG."
    );
  }

  const draft = await completeJson([
    { role: "system", content: systemPrompt(kind) },
    {
      role: "user",
      content:
        "Extrae el perfil clínico de este documento para el expediente:\n\n" +
        text,
    },
  ]);

  return { draft, textLength: text.length };
}

export async function extractClinicalProfileFromImage(input: {
  mime: string;
  bytes: Uint8Array;
  kind: ExpedienteDocumentKind;
}): Promise<ExtractedClinicalProfileDraft> {
  if (input.bytes.byteLength > IMAGE_MAX_BYTES) {
    throw new Error("La imagen supera 4 MB. Recórtala o baja la resolución.");
  }

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(input.mime)) {
    throw new Error("Usa JPEG, PNG o WebP. HEIC no está soportado.");
  }

  const base64 = Buffer.from(input.bytes).toString("base64");

  return completeJson([
    { role: "system", content: systemPrompt(input.kind) },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extrae el perfil clínico de esta receta o resultado (fotografía) para el expediente.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${input.mime};base64,${base64}`,
            detail: "high",
          },
        },
      ],
    },
  ]);
}

export function parseExpedienteKind(raw: FormDataEntryValue | null): ExpedienteDocumentKind {
  const value = typeof raw === "string" ? raw.trim() : "auto";
  if (value === "lab" || value === "prescription" || value === "auto") {
    return value;
  }
  return "auto";
}

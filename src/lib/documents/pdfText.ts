import { extractText, getDocumentProxy } from "unpdf";

/** Extrae texto de un PDF digital. Un escaneo sin capa de texto devuelve vacío. */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

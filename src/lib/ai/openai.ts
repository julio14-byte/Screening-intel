const CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ChatBody = {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  response_format?: { type: "json_object" };
};

/**
 * Única salida hacia el proveedor de IA. Pide que la respuesta no se almacene
 * y nunca envía un identificador de usuario. Quien llama debe haber enmascarado
 * antes los identificadores del texto (`redactIdentifiers`).
 */
export async function chatCompletion(body: ChatBody): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, store: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI no devolvió contenido.");
  return content;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { redactIdentifiers } from "@/lib/privacy/redact";
import {
  knownPatientNames,
  readEnrollmentTargets,
  readMissingDecisions,
  readMorningAppointments,
} from "@/lib/ai/screening-reads";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "Eres el asistente de screening de Crisvia para un clinical research site.",
  "Respondes en español de México, corto y concreto.",
  "Solo puedes usar estas lecturas: datos_que_faltan, citas_de_manana, meta_de_enrolamiento.",
  "No decides elegibilidad ni cambias etapas. El semáforo lo calcula el motor de reglas.",
  "Habla de pacientes solo con las iniciales que devuelve la herramienta.",
  "Si la herramienta trae error, dilo tal cual y no inventes cifras.",
].join(" ");

export const ASSISTANT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "datos_que_faltan",
      description:
        "Lista, en pre-screening y screening, los criterios que faltan para poder decidir. Devuelve iniciales, protocolo y el nombre del criterio.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "citas_de_manana",
      description:
        "Citas programadas de mañana en la zona horaria del centro, con iniciales, protocolo y qué falta o qué no se cumple.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "meta_de_enrolamiento",
      description:
        "Meta de randomizados por protocolo: ritmo, randomizados, faltante y días que quedan.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function runScreeningAssistant(input: {
  supabase: SupabaseClient;
  organizationId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  now: Date;
  timeZone: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const names = await knownPatientNames(input.supabase);
  const history: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.messages.slice(-8).map((message) => ({
      role: message.role,
      content:
        message.role === "user"
          ? redactIdentifiers(message.content, { names }).text
          : message.content,
    })),
  ];

  for (let step = 0; step < 4; step += 1) {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        store: false,
        tools: ASSISTANT_TOOLS,
        messages: history,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("OpenAI no devolvió contenido.");

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return message.content?.trim() || "No tengo una respuesta con los datos del centro.";
    }

    history.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: calls,
    });
    for (const call of calls) {
      history.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(
          await runTool(call.function.name, input)
        ),
      });
    }
  }

  return "No pude cerrar la consulta con las lecturas del centro. Intenta de nuevo con una sola pregunta.";
}

async function runTool(
  name: string,
  input: {
    supabase: SupabaseClient;
    organizationId: string;
    now: Date;
    timeZone: string;
  }
) {
  if (name === "datos_que_faltan") {
    return readMissingDecisions(input.supabase, input.organizationId);
  }
  if (name === "citas_de_manana") {
    return readMorningAppointments(
      input.supabase,
      input.organizationId,
      input.now,
      input.timeZone
    );
  }
  if (name === "meta_de_enrolamiento") {
    return readEnrollmentTargets(input.supabase, input.organizationId, input.now);
  }
  return { error: "Lectura no disponible." };
}

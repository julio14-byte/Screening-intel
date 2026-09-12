import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import type { UIMessage } from "ai";
import { generateId, type UIMessageStreamWriter } from "ai";
import { createScreeningLangChainTools } from "@/lib/agents/langchain-tools";
import { MCP_TOOL_NAMES } from "@/lib/agents/mcp-bridge";
import {
  extractTextFromLangChainMessage,
  isAssistantStreamChunk,
  uiMessagesToLangChain,
} from "@/lib/agents/message-adapter";

const SYSTEM_PROMPT =
  "Eres el asistente clínico de Screenlane. " +
  "Tus herramientas de screening están limitadas al centro del usuario. " +
  "Screening: searchPatientsByCriteria (condición/estatus), matchPatientsToProtocol (protocol_id), getScreenFailuresForRematch. " +
  "ICD-11: icd11_normalize_colloquial (coloquial → término oficial), icd11_search, icd11_get_entity. " +
  "Cuando el usuario use lenguaje coloquial (ej. 'presión alta', 'azúcar', 'tiroides lenta'), " +
  "usa icd11_normalize_colloquial antes de responder o buscar pacientes. " +
  "Presenta la conversión: coloquial → término ICD-11. " +
  "Responde en español latinoamericano, claro y conciso. " +
  "Al listar pacientes muestra solo iniciales (nunca nombre completo).";

const checkpointer = new MemorySaver();
const agents = new Map<string, Promise<ReturnType<typeof createReactAgent>>>();

async function buildScreeningAgent(organizationId: string) {
  const tools = createScreeningLangChainTools(organizationId);
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  return createReactAgent({
    llm: model,
    tools,
    prompt: SYSTEM_PROMPT,
    checkpointer,
  });
}

async function getScreeningAgent(organizationId: string) {
  let pending = agents.get(organizationId);
  if (!pending) {
    pending = buildScreeningAgent(organizationId);
    agents.set(organizationId, pending);
  }
  return pending;
}

export async function streamScreeningAgentToUI(
  messages: UIMessage[],
  writer: UIMessageStreamWriter,
  context: { userId: string; organizationId: string }
): Promise<string> {
  const textId = generateId();
  const langChainMessages = uiMessagesToLangChain(messages);
  let accumulated = "";

  writer.write({ type: "text-start", id: textId });

  const graph = await getScreeningAgent(context.organizationId);
  const stream = await graph.stream(
    { messages: langChainMessages },
    {
      streamMode: "messages",
      configurable: { thread_id: `screening:${context.userId}` },
    }
  );

  for await (const [message] of stream) {
    if (!isAssistantStreamChunk(message)) continue;

    const delta = extractTextFromLangChainMessage(message);
    if (!delta) continue;

    accumulated += delta;
    writer.write({ type: "text-delta", id: textId, delta });
  }

  writer.write({ type: "text-end", id: textId });
  return accumulated;
}

/** Nodos del grafo ReAct expuestos para debugging o UI futura. */
export const SCREENING_GRAPH_NODES = ["agent", "tools"] as const;

export { MCP_TOOL_NAMES };

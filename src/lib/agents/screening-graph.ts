import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import type { UIMessage } from "ai";
import { generateId, type UIMessageStreamWriter } from "ai";
import { loadMcpToolsForLangGraph, MCP_TOOL_NAMES } from "@/lib/agents/mcp-bridge";
import {
  extractTextFromLangChainMessage,
  isAssistantStreamChunk,
  uiMessagesToLangChain,
} from "@/lib/agents/message-adapter";

const SYSTEM_PROMPT =
  "Eres el asistente clínico inteligente de Screening Intelligence. " +
  "Tus herramientas vienen de servidores MCP acoplados a LangGraph. " +
  "Screening: search_patients (condición/estatus), match_protocol (protocol_id), list_screen_failures. " +
  "ICD-11: icd11_normalize_colloquial (coloquial → término oficial), icd11_search, icd11_get_entity. " +
  "Cuando el usuario use lenguaje coloquial (ej. 'presión alta', 'azúcar', 'tiroides lenta'), " +
  "usá icd11_normalize_colloquial antes de responder o buscar pacientes. " +
  "Presentá la conversión: coloquial → término ICD-11. " +
  "Responde en español, claro y conciso. Al listar pacientes o diagnósticos, muestra solo nombres.";

let agentPromise: Promise<ReturnType<typeof createReactAgent>> | null = null;

async function buildScreeningAgent() {
  const tools = await loadMcpToolsForLangGraph();
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  return createReactAgent({
    llm: model,
    tools,
    prompt: SYSTEM_PROMPT,
    checkpointer: new MemorySaver(),
  });
}

async function getScreeningAgent() {
  if (!agentPromise) {
    agentPromise = buildScreeningAgent();
  }
  return agentPromise;
}

export async function streamScreeningAgentToUI(
  messages: UIMessage[],
  writer: UIMessageStreamWriter
): Promise<string> {
  const textId = generateId();
  const langChainMessages = uiMessagesToLangChain(messages);
  let accumulated = "";

  writer.write({ type: "text-start", id: textId });

  const graph = await getScreeningAgent();
  const stream = await graph.stream(
    { messages: langChainMessages },
    {
      streamMode: "messages",
      configurable: { thread_id: "screening-chat" },
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

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { loadIcd11Env } from "@/lib/icd11/env";
import { screeningLangChainTools } from "@/lib/agents/langchain-tools";

const MCP_SERVERS = {
  screening: "screening",
  icd11: "icd11",
} as const;

let mcpClient: MultiServerMCPClient | null = null;
let mcpToolsPromise: Promise<DynamicStructuredTool[]> | null = null;

function subprocessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}

function getProjectRoot(): string {
  return process.cwd();
}

function createMcpClient(): MultiServerMCPClient {
  loadIcd11Env();

  const root = getProjectRoot();

  return new MultiServerMCPClient({
    throwOnLoadError: false,
    prefixToolNameWithServerName: false,
    mcpServers: {
      [MCP_SERVERS.screening]: {
        transport: "stdio",
        command: "yarn",
        args: ["mcp:screening"],
        cwd: root,
        env: subprocessEnv(),
        stderr: "pipe",
      },
      [MCP_SERVERS.icd11]: {
        transport: "stdio",
        command: "yarn",
        args: ["mcp:icd11"],
        cwd: root,
        env: subprocessEnv(),
        stderr: "pipe",
      },
    },
  });
}

/**
 * Carga herramientas MCP (screening + ICD-11) como StructuredTool[] para LangGraph.
 * Si MCP no está disponible, usa las tools locales como fallback.
 */
export async function loadMcpToolsForLangGraph(): Promise<DynamicStructuredTool[]> {
  if (!mcpToolsPromise) {
    mcpToolsPromise = loadMcpToolsForLangGraphInternal();
  }
  return mcpToolsPromise;
}

async function loadMcpToolsForLangGraphInternal(): Promise<
  DynamicStructuredTool[]
> {
  try {
    mcpClient = createMcpClient();
    const tools = await mcpClient.getTools();
    if (tools.length > 0) {
      console.info(
        `[LangGraph MCP] ${tools.length} tools cargadas:`,
        tools.map((tool) => tool.name).join(", ")
      );
      return tools;
    }
    throw new Error("MCP no devolvió herramientas.");
  } catch (error) {
    console.warn(
      "[LangGraph MCP] No se pudo conectar a los servidores MCP; usando tools locales.",
      error
    );
    return screeningLangChainTools;
  }
}

export async function closeMcpClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
  mcpToolsPromise = null;
}

export const MCP_TOOL_NAMES = {
  searchPatients: "search_patients",
  matchProtocol: "match_protocol",
  listScreenFailures: "list_screen_failures",
  icd11Normalize: "icd11_normalize_colloquial",
  icd11Search: "icd11_search",
  icd11GetEntity: "icd11_get_entity",
} as const;

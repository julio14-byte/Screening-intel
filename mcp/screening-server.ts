import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getScreenFailuresForRematch,
  matchPatientsToProtocol,
  searchPatientsByCriteria,
} from "../src/lib/screening-services";

/**
 * MCP server de Screening Intelligence.
 *
 * Uso local (Cursor / Claude Desktop):
 *   yarn mcp:screening
 *
 * Config Cursor (~/.cursor/mcp.json):
 * {
 *   "mcpServers": {
 *     "screening-intel": {
 *       "command": "yarn",
 *       "args": ["mcp:screening"],
 *       "cwd": "/ruta/a/Screening-intel",
 *       "env": {
 *         "NEXT_PUBLIC_SUPABASE_URL": "...",
 *         "SUPABASE_SERVICE_ROLE_KEY": "..."
 *       }
 *     }
 *   }
 * }
 */
const server = new McpServer(
  {
    name: "screening-intelligence",
    version: "0.1.0",
  },
  {
    instructions:
      "Herramientas clínicas para pre-screening, matching de protocolos y re-match en research sites.",
  }
);

server.registerTool(
  "search_patients",
  {
    description: "Busca pacientes por condición médica o estatus de screening.",
    inputSchema: {
      condition: z.string().optional(),
      status: z
        .enum([
          "pre_screening",
          "screening",
          "randomized",
          "screen_failure",
        ])
        .optional(),
    },
  },
  async ({ condition, status }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          await searchPatientsByCriteria({ condition, status }),
          null,
          2
        ),
      },
    ],
  })
);

server.registerTool(
  "match_protocol",
  {
    description: "Evalúa elegibilidad de pacientes contra un protocolo UUID.",
    inputSchema: {
      protocol_id: z.string(),
    },
  },
  async ({ protocol_id }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          await matchPatientsToProtocol({ protocol_id }),
          null,
          2
        ),
      },
    ],
  })
);

server.registerTool(
  "list_screen_failures",
  {
    description: "Lista pacientes en screen failure para re-match.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await getScreenFailuresForRematch(), null, 2),
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server error:", error);
  process.exit(1);
});

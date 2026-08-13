import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadIcd11Env } from "../src/lib/icd11/env";
import {
  runIcd11GetEntity,
  runIcd11NormalizeColloquial,
  runIcd11Search,
} from "../src/lib/icd11/services";

loadIcd11Env();

const server = new McpServer(
  {
    name: "icd11-terminology",
    version: "1.0.0",
  },
  {
    instructions:
      "Terminología clínica ICD-11 (OMS). Usa icd11_normalize_colloquial para convertir lenguaje coloquial " +
      "a terminología oficial, icd11_search para buscar diagnósticos y icd11_get_entity para el detalle.",
  }
);

server.registerTool(
  "icd11_normalize_colloquial",
  {
    description:
      "Convierte un término coloquial o informal a la terminología clínica oficial ICD-11 (OMS).",
    inputSchema: {
      colloquial: z
        .string()
        .describe("Término coloquial, p. ej. 'presión alta' o 'azúcar'"),
    },
  },
  async ({ colloquial }) => {
    try {
      const result = await runIcd11NormalizeColloquial(colloquial);
      if ("error" in result && result.error) {
        return {
          content: [{ type: "text", text: result.error }],
          isError: true,
        };
      }

      if (!result.normalized) {
        return {
          content: [
            {
              type: "text",
              text: result.message ?? `Sin equivalencia ICD-11 para "${colloquial}".`,
            },
          ],
        };
      }

      const lines = [
        result.summary,
        result.alternatives?.length
          ? `Alternativas: ${result.alternatives.join("; ")}`
          : null,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "icd11_search",
  {
    description:
      "Busca entidades clínicas en ICD-11 (linearización MMS de la OMS) por texto libre. Devuelve solo nombres.",
    inputSchema: {
      query: z
        .string()
        .describe("Término o frase a buscar, p. ej. 'diabetes tipo 2'"),
    },
  },
  async ({ query }) => {
    try {
      const result = await runIcd11Search(query);
      if (result.count === 0) {
        return {
          content: [{ type: "text", text: `Sin resultados ICD-11 para "${query}".` }],
        };
      }

      return {
        content: [{ type: "text", text: result.text }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "icd11_get_entity",
  {
    description:
      "Obtiene el detalle de una entidad ICD-11 por código o id/URI de icd11_search.",
    inputSchema: {
      idOrCode: z
        .string()
        .describe("Código ICD-11 o URI/id devuelto por icd11_search"),
    },
  },
  async ({ idOrCode }) => {
    try {
      const entity = await runIcd11GetEntity(idOrCode);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  if (!process.env.ICD11_CLIENT_ID || !process.env.ICD11_CLIENT_SECRET) {
    throw new Error(
      "Faltan ICD11_CLIENT_ID e ICD11_CLIENT_SECRET. Configuralas en .env.local o mcp-icd11/.env"
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP ICD-11 (WHO API) listo en stdio.");
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});

#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getIcd11Entity, searchIcd11 } from "./who-icd11.js";

function loadDotEnv() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const server = new McpServer(
  {
    name: "icd11-terminology",
    version: "1.0.0",
  },
  {
    instructions:
      "Terminología clínica ICD-11 (OMS). Usa icd11_search para buscar códigos y icd11_get_entity para el detalle.",
  }
);

server.registerTool(
  "icd11_search",
  {
    description:
      "Busca entidades clínicas en ICD-11 (linearización MMS de la OMS) por texto libre.",
    inputSchema: {
      query: z.string().describe("Término o frase a buscar, p. ej. 'diabetes tipo 2'"),
    },
  },
  async ({ query }) => {
    try {
      const results = await searchIcd11(query);
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `Sin resultados ICD-11 para "${query}".` }],
        };
      }

      const text = results
        .map(
          (result) =>
            `• ${result.code ?? "(sin código)"} — ${result.title}${
              result.matchingText ? ` [coincide: ${result.matchingText}]` : ""
            }\n  id: ${result.id}`
        )
        .join("\n");

      return { content: [{ type: "text", text }] };
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
        .describe("Código ICD-11 (p. ej. '5A11') o URI/id devuelto por icd11_search"),
    },
  },
  async ({ idOrCode }) => {
    try {
      const entity = await getIcd11Entity(idOrCode);
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
      "Faltan ICD11_CLIENT_ID e ICD11_CLIENT_SECRET. Copiá mcp-icd11/.env.example a mcp-icd11/.env"
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

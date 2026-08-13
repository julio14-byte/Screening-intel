import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getScreenFailuresForRematch,
  matchPatientsToProtocol,
  searchPatientsByCriteria,
} from "@/lib/screening-services";
import { icd11LangChainTools } from "@/lib/icd11/langchain-tools";

/** Fallback local si los servidores MCP no están disponibles en runtime. */
export const screeningLangChainTools = [
  tool(
    async ({ condition, status }) => searchPatientsByCriteria({ condition, status }),
    {
      name: "searchPatientsByCriteria",
      description:
        "Busca pacientes según condición médica o estatus de screening.",
      schema: z.object({
        condition: z.string().optional(),
        status: z
          .enum([
            "pre_screening",
            "screening",
            "randomized",
            "screen_failure",
          ])
          .optional(),
      }),
    }
  ),
  tool(
    async ({ protocol_id }) => matchPatientsToProtocol({ protocol_id }),
    {
      name: "matchPatientsToProtocol",
      description:
        "Evalúa elegibilidad de todos los pacientes contra un protocolo.",
      schema: z.object({
        protocol_id: z.string(),
      }),
    }
  ),
  tool(async () => getScreenFailuresForRematch(), {
    name: "getScreenFailuresForRematch",
    description: "Lista pacientes en screen failure para re-match.",
    schema: z.object({}),
  }),
  ...icd11LangChainTools,
];

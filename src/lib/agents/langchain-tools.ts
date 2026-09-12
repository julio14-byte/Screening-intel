import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getScreenFailuresForRematch,
  matchPatientsToProtocol,
  searchPatientsByCriteria,
} from "@/lib/screening-services";
import { icd11LangChainTools } from "@/lib/icd11/langchain-tools";

const screeningStatusSchema = z
  .enum(["pre_screening", "screening", "randomized", "screen_failure"])
  .optional();

/** Tools de screening acotadas a un clinical research site. */
export function createScreeningLangChainTools(organizationId: string) {
  return [
    tool(
      async ({ condition, status }) =>
        searchPatientsByCriteria({ organizationId, condition, status }),
      {
        name: "searchPatientsByCriteria",
        description:
          "Busca pacientes del centro según condición médica o estatus de screening. Devuelve iniciales, no nombres.",
        schema: z.object({
          condition: z.string().optional(),
          status: screeningStatusSchema,
        }),
      }
    ),
    tool(
      async ({ protocol_id }) =>
        matchPatientsToProtocol({ organizationId, protocol_id }),
      {
        name: "matchPatientsToProtocol",
        description:
          "Evalúa elegibilidad de los pacientes del centro contra un protocolo del mismo site.",
        schema: z.object({
          protocol_id: z.string(),
        }),
      }
    ),
    tool(async () => getScreenFailuresForRematch({ organizationId }), {
      name: "getScreenFailuresForRematch",
      description:
        "Lista pacientes en screen failure del centro para re-match (iniciales).",
      schema: z.object({}),
    }),
    ...icd11LangChainTools,
  ];
}

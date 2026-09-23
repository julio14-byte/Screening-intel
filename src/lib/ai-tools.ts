import { tool } from "ai";
import { z } from "zod";
import {
  getScreenFailuresForRematch,
  matchPatientsToProtocol,
  searchPatientsByCriteria,
} from "@/lib/screening-services";
import {
  draftOutreachTemplate,
  getCoordinatorQueue,
  OUTREACH_KINDS,
} from "@/lib/queue/coordinatorQueue";

const screeningStatusSchema = z
  .enum(["pre_screening", "screening", "randomized", "screen_failure"])
  .optional();

/** Tools AI SDK acotadas a un clinical research site. */
export function createScreeningTools(organizationId: string) {
  return {
    searchPatientsByCriteria: tool({
      description:
        "Busca pacientes de la clínica según condiciones médicas o estado de screening. Devuelve iniciales.",
      inputSchema: z.object({
        condition: z.string().optional(),
        status: screeningStatusSchema,
      }),
      execute: ({ condition, status }) =>
        searchPatientsByCriteria({ organizationId, condition, status }),
    }),

    matchPatientsToProtocol: tool({
      description:
        "Cruza los pacientes del centro con los criterios de un protocolo del mismo site.",
      inputSchema: z.object({
        protocol_id: z.string(),
      }),
      execute: ({ protocol_id }) =>
        matchPatientsToProtocol({ organizationId, protocol_id }),
    }),

    getScreenFailuresForRematch: tool({
      description:
        "Busca screen failures del centro para ofrecer otros protocolos activos.",
      inputSchema: z.object({}),
      execute: () => getScreenFailuresForRematch({ organizationId }),
    }),

    getCoordinatorQueue: tool({
      description:
        "Cola del coordinador: inbox pendiente, criterios 🟡 y screen failures. Solo iniciales. No cambia elegibilidad.",
      inputSchema: z.object({}),
      execute: () => getCoordinatorQueue({ organizationId }),
    }),

    draftOutreachTemplate: tool({
      description:
        "Borrador de mensaje (te_llamamos, trae_receta, link_portal). No envía el mensaje.",
      inputSchema: z.object({
        kind: z.enum(OUTREACH_KINDS),
        initials: z.string().optional(),
      }),
      execute: ({ kind, initials }) => draftOutreachTemplate(kind, initials),
    }),
  };
}

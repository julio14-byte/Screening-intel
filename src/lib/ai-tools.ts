import { tool } from "ai";
import { z } from "zod";
import {
  getScreenFailuresForRematch,
  matchPatientsToProtocol,
  searchPatientsByCriteria,
} from "@/lib/screening-services";

export const screeningTools = {
  searchPatientsByCriteria: tool({
    description:
      "Busca pacientes en la base de datos de la clínica según condiciones médicas o estado de screening.",
    inputSchema: z.object({
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
    execute: searchPatientsByCriteria,
  }),

  matchPatientsToProtocol: tool({
    description:
      "Ejecuta el motor de reglas para cruzar los pacientes de la clínica con los criterios de un protocolo específico.",
    inputSchema: z.object({
      protocol_id: z.string(),
    }),
    execute: matchPatientsToProtocol,
  }),

  getScreenFailuresForRematch: tool({
    description:
      "Busca pacientes que cayeron en Screen Failure para ofrecerles otros protocolos activos.",
    inputSchema: z.object({}),
    execute: getScreenFailuresForRematch,
  }),
};

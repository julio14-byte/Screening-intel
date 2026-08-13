import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  runIcd11GetEntity,
  runIcd11NormalizeColloquial,
  runIcd11Search,
} from "@/lib/icd11/services";

export const icd11LangChainTools = [
  tool(async ({ colloquial }) => runIcd11NormalizeColloquial(colloquial), {
    name: "icd11_normalize_colloquial",
    description:
      "Convierte un término coloquial o informal (ej. 'presión alta', 'azúcar', 'corazón grande') " +
      "a la terminología clínica oficial ICD-11 (OMS). Usar SIEMPRE que el usuario hable en lenguaje " +
      "cotidiano, pida traducir/normalizar un término, o mencione una condición sin nombre médico formal.",
    schema: z.object({
      colloquial: z
        .string()
        .describe("Término coloquial o frase informal del usuario"),
    }),
  }),
  tool(async ({ query }) => runIcd11Search(query), {
    name: "icd11_search",
    description:
      "Busca diagnósticos en ICD-11 (OMS) por texto libre. Devuelve solo nombres clínicos.",
    schema: z.object({
      query: z.string().describe("Término clínico, p. ej. 'diabetes tipo 2'"),
    }),
  }),
  tool(async ({ idOrCode }) => runIcd11GetEntity(idOrCode), {
    name: "icd11_get_entity",
    description:
      "Detalle de una entidad ICD-11 por código o id obtenido en icd11_search.",
    schema: z.object({
      idOrCode: z.string(),
    }),
  }),
];

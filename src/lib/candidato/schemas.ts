import { z } from "zod";

export const candidatoSubmitSchema = z.object({
  orgSlug: z.string().trim().min(2).max(80),
  protocolCode: z.string().trim().max(80).optional(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(d)), "Fecha inválida"),
  gender: z.enum(["male", "female", "other"]),
  conditions: z.array(z.string().trim().max(200)).max(30).default([]),
  medications: z.array(z.string().trim().max(200)).max(30).default([]),
  raw_notes: z.string().trim().max(4000).optional(),
  contact_email: z
    .string()
    .trim()
    .email()
    .max(320)
    .optional()
    .or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Debes aceptar el aviso." }),
});

export type CandidatoSubmitBody = z.infer<typeof candidatoSubmitSchema>;

export type IntakeMatchSummary = {
  protocol_id: string;
  protocol_code: string;
  protocol_title: string;
  verdict: "eligible" | "pending" | "excluded";
  score: number;
};

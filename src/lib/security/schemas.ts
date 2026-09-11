import { z } from "zod";

const uuid = z.string().uuid();

/** Sanitiza texto clínico: trim, longitud máxima, sin caracteres de control. */
export const clinicalText = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((s) => !/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/.test(s), {
    message: "Caracteres no permitidos",
  });

export const optionalClinicalText = clinicalText.optional().or(z.literal(""));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(320);

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128)
  .refine((s) => /[A-Za-z]/.test(s) && /[0-9]/.test(s), {
    message: "Debe incluir letras y números",
  });

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const genderSchema = z.enum(["male", "female", "other"]);

export const patientRowSchema = z.object({
  first_name: clinicalText.max(120),
  last_name: clinicalText.max(120),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Fecha inválida"),
  gender: genderSchema,
  conditions: z.array(clinicalText.max(200)).max(50).default([]),
  medications: z.array(clinicalText.max(200)).max(50).default([]),
  laboratories: z
    .record(z.string().max(80), z.number().finite())
    .default({}),
});

export const patientImportBodySchema = z.object({
  patients: z.array(patientRowSchema).min(1).max(500),
});

export const appRoleSchema = z.enum([
  "investigator",
  "coordinator",
  "monitor",
]);

export const createSiteUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: clinicalText.max(200),
  clinicalRole: appRoleSchema,
});

export const assignRoleSchema = z.object({
  userId: uuid,
  role: appRoleSchema,
});

export const customAuditEventSchema = z.object({
  tableName: z.enum(["patients", "clinical_profiles", "screenings", "protocols"]),
  recordId: uuid,
  description: clinicalText.max(2000),
  metadata: z.record(z.string().max(80), z.unknown()).optional(),
  userId: uuid.nullish(),
});

export const waitlistBodySchema = z.object({
  email: emailSchema,
  source: z.string().trim().max(64).optional(),
});

export const auditQuerySchema = z.object({
  table_name: z.enum(["patients", "clinical_profiles", "screenings", "protocols"]),
  record_id: uuid,
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const inclusionApprovalSchema = z.object({
  patientId: uuid,
  protocolId: z.union([uuid, z.literal("general")]),
  criterion: clinicalText.max(500),
  approvedByUserId: uuid.nullish(),
  notes: optionalClinicalText,
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type PatientImportBody = z.infer<typeof patientImportBodySchema>;
export type CreateSiteUserBody = z.infer<typeof createSiteUserSchema>;

/** Parsea y devuelve datos tipados o lanza ZodError. */
export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/** Variante segura para APIs — devuelve error formateado. */
export function safeParseBody<T extends z.ZodType>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const msg = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: msg || "Datos inválidos" };
}

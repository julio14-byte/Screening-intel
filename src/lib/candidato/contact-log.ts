import { z } from "zod";

export const CONTACT_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021090000_candidate_contact_log.sql en Supabase.";

export const CONTACT_CHANNELS = ["phone", "whatsapp", "sms", "email", "in_person"] as const;
export const CONTACT_OUTCOMES = [
  "reached",
  "no_answer",
  "voicemail",
  "wrong_number",
  "declined",
  "scheduled",
] as const;

export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: "Llamada",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Correo",
  in_person: "En persona",
};

export const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  reached: "Se habló con el candidato",
  no_answer: "No contestó",
  voicemail: "Buzón de voz",
  wrong_number: "Número equivocado",
  declined: "No le interesa",
  scheduled: "Cita agendada",
};

/** Resultados que cierran el ciclo de contacto: no hace falta reintentar. */
const CLOSING_OUTCOMES: readonly ContactOutcome[] = [
  "reached",
  "wrong_number",
  "declined",
  "scheduled",
];

export const FIRST_CONTACT_SLA_HOURS = 48;
export const WARNING_HOURS = 24;
export const MAX_UNANSWERED_ATTEMPTS = 3;

export const CONTACT_ATTEMPT_COLUMNS =
  "id, submission_id, channel, outcome, notes, next_attempt_on, attempted_at";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

export const contactAttemptSchema = z.object({
  submission_id: z.string().uuid("Candidato inválido."),
  channel: z.enum(CONTACT_CHANNELS, { error: "Canal inválido." }),
  outcome: z.enum(CONTACT_OUTCOMES, { error: "Resultado inválido." }),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas admiten hasta 500 caracteres.")
    .nullable()
    .optional(),
  next_attempt_on: isoDate.nullable().optional(),
});

export type ContactAttemptInput = z.infer<typeof contactAttemptSchema>;

export interface ContactAttempt {
  id: string;
  submission_id: string;
  channel: ContactChannel;
  outcome: ContactOutcome;
  notes: string | null;
  next_attempt_on: string | null;
  attempted_at: string;
}

export type ContactState =
  | "overdue"
  | "due_soon"
  | "new"
  | "follow_up_due"
  | "waiting"
  | "unreachable"
  | "closed";

export const CONTACT_STATE_LABELS: Record<ContactState, string> = {
  overdue: "Sin contacto en más de 48 h",
  due_soon: "Contactar hoy",
  new: "Nuevo, dentro de las primeras 24 h",
  follow_up_due: "Reintento pendiente",
  waiting: "Reintento programado",
  unreachable: "Sin respuesta tras varios intentos",
  closed: "Contacto concluido",
};

export interface ContactStatus {
  state: ContactState;
  attempts: number;
  lastAttempt: ContactAttempt | null;
  hoursWithoutContact: number | null;
  /** Mayor valor = más urgente; sirve para ordenar la bandeja. */
  urgency: number;
}

const URGENCY: Record<ContactState, number> = {
  overdue: 5,
  follow_up_due: 4,
  due_soon: 3,
  new: 2.5,
  unreachable: 2,
  waiting: 1,
  closed: 0,
};

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function buildContactStatus(
  submissionCreatedAt: string,
  attemptsForSubmission: ContactAttempt[],
  now: Date = new Date()
): ContactStatus {
  const attempts = attemptsForSubmission
    .slice()
    .sort((a, b) => a.attempted_at.localeCompare(b.attempted_at));
  const last = attempts.at(-1) ?? null;

  const make = (state: ContactState, hours: number | null): ContactStatus => ({
    state,
    attempts: attempts.length,
    lastAttempt: last,
    hoursWithoutContact: hours,
    urgency: URGENCY[state],
  });

  if (!last) {
    const hours = Math.max(
      0,
      Math.floor((now.getTime() - Date.parse(submissionCreatedAt)) / 3_600_000)
    );
    if (hours >= FIRST_CONTACT_SLA_HOURS) return make("overdue", hours);
    if (hours >= WARNING_HOURS) return make("due_soon", hours);
    return make("new", hours);
  }

  if (CLOSING_OUTCOMES.includes(last.outcome)) return make("closed", null);

  const unanswered = attempts.filter((a) => !CLOSING_OUTCOMES.includes(a.outcome)).length;
  if (unanswered >= MAX_UNANSWERED_ATTEMPTS) return make("unreachable", null);

  if (last.next_attempt_on && last.next_attempt_on > localDay(now)) {
    return make("waiting", null);
  }
  return make("follow_up_due", null);
}

export function summarizeContact(statuses: ContactStatus[]) {
  const count = (s: ContactState) => statuses.filter((x) => x.state === s).length;
  return {
    overdue: count("overdue"),
    followUpDue: count("follow_up_due"),
    unreachable: count("unreachable"),
  };
}

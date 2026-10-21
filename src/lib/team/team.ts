import { z } from "zod";
import { siteDisplayName, siteLocation, type SiteProfile } from "@/lib/site/profile";

export const TEAM_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021100000_site_team_delegation.sql en Supabase.";

export const STAFF_ROLES = [
  "principal_investigator",
  "sub_investigator",
  "coordinator",
  "nurse",
  "pharmacist",
  "lab_technician",
  "other",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  principal_investigator: "Investigador principal",
  sub_investigator: "Sub-investigador",
  coordinator: "Coordinador de estudio",
  nurse: "Enfermería",
  pharmacist: "Farmacia",
  lab_technician: "Laboratorio",
  other: "Otro",
};

export const DELEGABLE_TASKS = [
  "consent",
  "history_physical",
  "vitals",
  "ecg",
  "blood_draw",
  "ip_dispense",
  "ip_accountability",
  "randomization",
  "ae_assessment",
  "data_entry",
  "lab_processing",
] as const;
export type DelegableTask = (typeof DELEGABLE_TASKS)[number];

export const TASK_LABELS: Record<DelegableTask, string> = {
  consent: "Consentimiento informado",
  history_physical: "Historia clínica y exploración",
  vitals: "Signos vitales",
  ecg: "Electrocardiograma",
  blood_draw: "Toma de muestras",
  ip_dispense: "Entrega de medicamento del estudio",
  ip_accountability: "Contabilidad del medicamento",
  randomization: "Randomización",
  ae_assessment: "Evaluación de eventos adversos",
  data_entry: "Captura de datos",
  lab_processing: "Procesamiento de muestras",
};

export const STAFF_COLUMNS =
  "id, full_name, role_title, email, professional_license, gcp_expires_on, license_expires_on, active";
export const DELEGATION_COLUMNS =
  "id, staff_id, protocol_id, tasks, delegated_on, ended_on";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida.");

export const staffSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2, "Escribe el nombre completo.").max(160),
  role_title: z.enum(STAFF_ROLES, { error: "Rol inválido." }),
  email: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Correo inválido.")
    .nullable()
    .optional(),
  professional_license: z.string().trim().max(60).nullable().optional(),
  gcp_expires_on: isoDate.nullable().optional(),
  license_expires_on: isoDate.nullable().optional(),
  active: z.boolean().optional(),
});
export type StaffInput = z.infer<typeof staffSchema>;

export const delegationSchema = z.object({
  staff_id: z.string().uuid("Persona inválida."),
  protocol_id: z.string().uuid("Protocolo inválido."),
  tasks: z
    .array(z.enum(DELEGABLE_TASKS, { error: "Tarea inválida." }))
    .min(1, "Elige al menos una tarea.")
    .transform((tasks) => [...new Set(tasks)]),
  delegated_on: isoDate.optional(),
});
export type DelegationInput = z.infer<typeof delegationSchema>;

export const endDelegationSchema = z.object({
  id: z.string().uuid("Delegación inválida."),
  ended_on: isoDate,
});

export interface StaffMember {
  id: string;
  full_name: string;
  role_title: StaffRole;
  email: string | null;
  professional_license: string | null;
  gcp_expires_on: string | null;
  license_expires_on: string | null;
  active: boolean;
}

export interface Delegation {
  id: string;
  staff_id: string;
  protocol_id: string;
  tasks: DelegableTask[];
  delegated_on: string;
  ended_on: string | null;
}

export const EXPIRY_WARNING_DAYS = 60;

export type CredentialState = "none" | "valid" | "expiring" | "expired";

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function credentialState(
  expiresOn: string | null | undefined,
  today: Date = new Date()
): { state: CredentialState; daysLeft: number | null } {
  if (!expiresOn) return { state: "none", daysLeft: null };
  const daysLeft = Math.round((dayMs(expiresOn) - dayMs(localDay(today))) / 86_400_000);
  if (daysLeft < 0) return { state: "expired", daysLeft };
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { state: "expiring", daysLeft };
  return { state: "valid", daysLeft };
}

/** Vigente hoy: ya inició y no ha terminado. */
export function isDelegationActive(d: Delegation, today: Date = new Date()): boolean {
  const t = localDay(today);
  return d.delegated_on <= t && (!d.ended_on || d.ended_on >= t);
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface TeamAlert {
  severity: AlertSeverity;
  staffId: string | null;
  protocolId: string | null;
  message: string;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function buildTeamAlerts(
  staff: StaffMember[],
  delegations: Delegation[],
  protocols: { id: string; code_name: string; status?: string }[] = [],
  today: Date = new Date()
): TeamAlert[] {
  const alerts: TeamAlert[] = [];
  const active = delegations.filter((d) => isDelegationActive(d, today));
  const delegatedStaff = new Set(active.map((d) => d.staff_id));

  for (const person of staff) {
    const delegated = delegatedStaff.has(person.id);
    const gcp = credentialState(person.gcp_expires_on, today);
    const license = credentialState(person.license_expires_on, today);

    if (!person.active && delegated) {
      alerts.push({
        severity: "critical",
        staffId: person.id,
        protocolId: null,
        message: `${person.full_name} está dado de baja y conserva tareas delegadas vigentes.`,
      });
    }
    if (!person.active) continue;

    if (gcp.state === "expired") {
      alerts.push({
        severity: delegated ? "critical" : "warning",
        staffId: person.id,
        protocolId: null,
        message: delegated
          ? `${person.full_name} tiene tareas delegadas con la capacitación GCP vencida.`
          : `La capacitación GCP de ${person.full_name} está vencida.`,
      });
    } else if (gcp.state === "expiring") {
      alerts.push({
        severity: "warning",
        staffId: person.id,
        protocolId: null,
        message: `La capacitación GCP de ${person.full_name} vence en ${gcp.daysLeft} días.`,
      });
    } else if (gcp.state === "none" && delegated) {
      alerts.push({
        severity: "warning",
        staffId: person.id,
        protocolId: null,
        message: `${person.full_name} tiene tareas delegadas y no se registró su vigencia de GCP.`,
      });
    }

    if (license.state === "expired") {
      alerts.push({
        severity: delegated ? "critical" : "warning",
        staffId: person.id,
        protocolId: null,
        message: `La licencia de ${person.full_name} está vencida.`,
      });
    } else if (license.state === "expiring") {
      alerts.push({
        severity: "warning",
        staffId: person.id,
        protocolId: null,
        message: `La licencia de ${person.full_name} vence en ${license.daysLeft} días.`,
      });
    }
  }

  const protocolsWithDelegation = new Set(active.map((d) => d.protocol_id));
  for (const protocol of protocols) {
    if (protocol.status && protocol.status !== "active") continue;
    if (!protocolsWithDelegation.has(protocol.id)) {
      alerts.push({
        severity: "info",
        staffId: null,
        protocolId: protocol.id,
        message: `${protocol.code_name} no tiene delegaciones vigentes.`,
      });
    }
  }

  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}

function csvEscape(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function delegationLogToCsv(
  delegations: Delegation[],
  staff: StaffMember[],
  protocols: { id: string; code_name: string; title: string }[],
  site?: SiteProfile | null,
  reportDate: Date = new Date()
): string {
  const lines: string[] = [];
  const siteName = siteDisplayName(site);
  if (site && siteName) {
    lines.push(["Bitácora de delegación", siteName].map(csvEscape).join(","));
    if (site.pi_name) lines.push(["Investigador principal", site.pi_name].map(csvEscape).join(","));
    const where = siteLocation(site);
    if (where) lines.push(["Ubicación", where].map(csvEscape).join(","));
    lines.push(["Fecha del reporte", reportDate.toISOString().slice(0, 10)].join(","));
    lines.push("");
  }
  lines.push(
    [
      "protocolo",
      "persona",
      "rol",
      "licencia_profesional",
      "tareas_delegadas",
      "delegado_desde",
      "delegado_hasta",
      "gcp_vence",
    ].join(",")
  );
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const protocolById = new Map(protocols.map((p) => [p.id, p]));
  const sorted = delegations
    .slice()
    .sort(
      (a, b) =>
        (protocolById.get(a.protocol_id)?.code_name ?? "").localeCompare(
          protocolById.get(b.protocol_id)?.code_name ?? ""
        ) || a.delegated_on.localeCompare(b.delegated_on)
    );
  for (const d of sorted) {
    const person = staffById.get(d.staff_id);
    lines.push(
      [
        csvEscape(protocolById.get(d.protocol_id)?.code_name ?? ""),
        csvEscape(person?.full_name ?? ""),
        csvEscape(person ? STAFF_ROLE_LABELS[person.role_title] : ""),
        csvEscape(person?.professional_license ?? ""),
        csvEscape(d.tasks.map((t) => TASK_LABELS[t]).join("; ")),
        d.delegated_on,
        d.ended_on ?? "",
        person?.gcp_expires_on ?? "",
      ].join(",")
    );
  }
  return lines.join("\n");
}

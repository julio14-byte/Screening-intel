/** Roles clínicos del clinical research site (alineado con enum `app_role` en Postgres). */
export type AppRole =
  | "investigator"
  | "sub_investigator"
  | "coordinator"
  | "monitor";

/** Permisos granulares evaluados en servidor y cliente. */
export type Permission =
  | "patients:read"
  | "patients:write"
  | "patients:delete"
  | "profiles:read"
  | "profiles:write"
  | "protocols:read"
  | "protocols:write"
  | "screenings:read"
  | "screenings:write"
  | "screenings:approve"
  | "audit:read"
  | "audit:write"
  | "roles:manage"
  | "billing:manage";

export interface UserRoleRecord {
  user_id: string;
  role: AppRole;
  assigned_by: string | null;
  assigned_at: string;
  updated_at: string;
}

export interface OrganizationMemberWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  org_role: string;
  clinical_role: AppRole;
}

export interface ProtocolAssignmentMember extends OrganizationMemberWithRole {
  assigned: boolean;
  assigned_at: string | null;
}

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  investigator: "Investigador Principal",
  sub_investigator: "Sub-investigador",
  coordinator: "Coordinador de Estudio",
  monitor: "Monitor CRA / Auditor",
};

export const APP_ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  investigator:
    "Control total del centro: protocolos, asignaciones de equipo, aprobaciones, roles y facturación.",
  sub_investigator:
    "Aprobaciones y screening en los protocolos asignados; sin gestión de roles ni facturación.",
  coordinator:
    "Registro de pacientes y screening operativo. Solo ve los protocolos que el PI le asigna.",
  monitor:
    "Solo lectura del expediente y bitácora, limitado a los protocolos asignados (CRA).",
};

/** Roles con autoridad clínica (PI y sub-PI). */
export const CLINICAL_LEAD_ROLES: readonly AppRole[] = [
  "investigator",
  "sub_investigator",
];

export function isClinicalLead(role: AppRole): boolean {
  return CLINICAL_LEAD_ROLES.includes(role);
}

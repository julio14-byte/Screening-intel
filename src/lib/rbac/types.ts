/** Roles clínicos del research site (alineado con enum `app_role` en Postgres). */
export type AppRole = "investigator" | "coordinator" | "monitor";

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

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  investigator: "Investigador Principal",
  coordinator: "Coordinador de Estudio",
  monitor: "Monitor CRA / Auditor",
};

export const APP_ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  investigator:
    "Control total: aprobaciones médicas, protocolos, firmas y gestión de roles.",
  coordinator:
    "Registro de pacientes, captura de datos clínicos y screening operativo.",
  monitor:
    "Solo lectura: revisión de expedientes y bitácora de auditoría (CRA).",
};

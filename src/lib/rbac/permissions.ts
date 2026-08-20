import type { AppRole, Permission } from "./types";

/** Matriz de permisos por rol clínico. */
export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  investigator: [
    "patients:read",
    "patients:write",
    "patients:delete",
    "profiles:read",
    "profiles:write",
    "protocols:read",
    "protocols:write",
    "screenings:read",
    "screenings:write",
    "screenings:approve",
    "audit:read",
    "audit:write",
    "roles:manage",
    "billing:manage",
  ],
  coordinator: [
    "patients:read",
    "patients:write",
    "profiles:read",
    "profiles:write",
    "protocols:read",
    "screenings:read",
    "screenings:write",
    "audit:read",
    "audit:write",
  ],
  monitor: [
    "patients:read",
    "profiles:read",
    "protocols:read",
    "screenings:read",
    "audit:read",
  ],
};

export function roleHasPermission(
  role: AppRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleHasAnyPermission(
  role: AppRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => roleHasPermission(role, p));
}

/** Rutas de API que requieren permiso de escritura clínica. */
export const WRITE_API_PREFIXES = [
  "/api/patients/import",
  "/api/protocols/extract",
  "/api/audit",
  "/api/rbac",
] as const;

/** Rutas de app restringidas por rol. */
export const ROLE_RESTRICTED_ROUTES: Record<string, AppRole[]> = {
  "/settings/roles": ["investigator"],
  "/account/billing": ["investigator"],
};

export function isRouteAllowedForRole(pathname: string, role: AppRole): boolean {
  for (const [route, allowed] of Object.entries(ROLE_RESTRICTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return allowed.includes(role);
    }
  }
  return true;
}

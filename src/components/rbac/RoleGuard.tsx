"use client";

import type { ReactNode } from "react";
import { useRole } from "@/contexts/role-context";
import type { AppRole, Permission } from "@/lib/rbac/types";

type RoleGuardProps = {
  children: ReactNode;
  /** Roles clínicos permitidos (OR). */
  allowedRoles?: AppRole[];
  /** Permiso requerido (alternativa o complemento a allowedRoles). */
  permission?: Permission;
  /** Varios permisos — basta con uno (OR). */
  anyPermission?: Permission[];
  /** Contenido alternativo cuando no hay acceso. */
  fallback?: ReactNode;
  /** Si true, deshabilita en lugar de ocultar (para botones). */
  disableOnly?: boolean;
};

/**
 * Control de acceso condicional por rol o permiso.
 * Oculta acciones críticas a usuarios no autorizados (monitor CRA, etc.).
 */
export function RoleGuard({
  children,
  allowedRoles,
  permission,
  anyPermission,
  fallback = null,
  disableOnly = false,
}: RoleGuardProps) {
  const { role, loading, hasPermission, hasAnyPermission, hasRole } =
    useRole();

  if (loading) return null;

  let allowed = true;

  if (allowedRoles?.length) {
    allowed = hasRole(allowedRoles);
  }

  if (permission) {
    allowed = allowed && hasPermission(permission);
  }

  if (anyPermission?.length) {
    allowed = allowed && hasAnyPermission(anyPermission);
  }

  if (!allowed) {
    if (disableOnly && children) {
      return (
        <span className="inline-block cursor-not-allowed opacity-50" aria-hidden>
          <span className="pointer-events-none">{children}</span>
        </span>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default RoleGuard;

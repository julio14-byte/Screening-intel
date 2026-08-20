import { getAuthContext } from "./get-user-role";
import {
  isRouteAllowedForRole,
  roleHasAnyPermission,
  roleHasPermission,
} from "./permissions";
import type { AppRole, Permission } from "./types";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" = "FORBIDDEN"
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Exige sesión activa; devuelve user + rol. */
export async function requireAuth() {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new AuthorizationError("No autenticado.", "UNAUTHENTICATED");
  }
  return ctx;
}

/** Exige un permiso concreto. */
export async function requirePermission(permission: Permission) {
  const ctx = await requireAuth();
  if (!roleHasPermission(ctx.role, permission)) {
    throw new AuthorizationError(
      `Permiso denegado: se requiere «${permission}» (rol actual: ${ctx.role}).`
    );
  }
  return ctx;
}

/** Exige uno de varios roles clínicos. */
export async function requireRole(allowedRoles: AppRole[]) {
  const ctx = await requireAuth();
  if (!allowedRoles.includes(ctx.role)) {
    throw new AuthorizationError(
      `Rol no autorizado. Se requiere: ${allowedRoles.join(", ")}.`
    );
  }
  return ctx;
}

/** Exige acceso a una ruta según mapa RBAC. */
export async function requireRouteAccess(pathname: string) {
  const ctx = await requireAuth();
  if (!isRouteAllowedForRole(pathname, ctx.role)) {
    throw new AuthorizationError(
      `Tu rol (${ctx.role}) no tiene acceso a ${pathname}.`
    );
  }
  return ctx;
}

/** Evalúa permiso sin lanzar (útil en UI server-side). */
export async function checkPermission(
  permission: Permission
): Promise<boolean> {
  const ctx = await getAuthContext();
  if (!ctx) return false;
  return roleHasPermission(ctx.role, permission);
}

export { roleHasPermission, roleHasAnyPermission };

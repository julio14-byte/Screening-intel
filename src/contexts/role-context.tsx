"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  roleHasAnyPermission,
  roleHasPermission,
} from "@/lib/rbac/permissions";
import type { AppRole, Permission } from "@/lib/rbac/types";

interface RoleContextValue {
  role: AppRole | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (roles: AppRole[]) => boolean;
  isReadOnly: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasRole: () => false,
  isReadOnly: true,
});

export function RoleProvider({
  role,
  loading = false,
  children,
}: {
  role: AppRole | null;
  loading?: boolean;
  children: ReactNode;
}) {
  const value = useMemo<RoleContextValue>(() => {
    const effectiveRole = role ?? "monitor";
    return {
      role,
      loading,
      hasPermission: (permission: Permission) =>
        role ? roleHasPermission(role, permission) : false,
      hasAnyPermission: (permissions: Permission[]) =>
        role ? roleHasAnyPermission(role, permissions) : false,
      hasRole: (roles: AppRole[]) => (role ? roles.includes(role) : false),
      isReadOnly: effectiveRole === "monitor",
    };
  }, [role, loading]);

  return (
    <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

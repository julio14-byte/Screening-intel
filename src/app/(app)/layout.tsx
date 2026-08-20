import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleProvider } from "@/contexts/role-context";
import config from "@/config";
import { getUserAppRole } from "@/lib/rbac/get-user-role";
import { getUser } from "@/lib/supabase/server";

/** Zona privada con shell de la aplicación. */
export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect(config.auth.loginUrl);

  const role = await getUserAppRole(user.id);

  return (
    <RoleProvider role={role}>
      <AppShell>{children}</AppShell>
    </RoleProvider>
  );
}

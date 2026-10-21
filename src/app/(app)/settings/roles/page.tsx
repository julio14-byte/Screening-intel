import { redirect } from "next/navigation";
import { RoleAdminPanel } from "@/components/rbac/RoleAdminPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import config from "@/config";
import { requireRouteAccess } from "@/lib/rbac/require-permission";
import { APP_ROLE_LABELS } from "@/lib/rbac/types";

export default async function RolesAdminPage() {
  const access = await requireRouteAccess("/settings/roles").catch(() => null);
  if (!access) redirect(config.auth.afterLoginUrl);

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description={APP_ROLE_LABELS[access.role]}
      />
      <RoleAdminPanel />
    </>
  );
}

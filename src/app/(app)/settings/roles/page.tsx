import { redirect } from "next/navigation";
import { RoleAdminPanel } from "@/components/rbac/RoleAdminPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import config from "@/config";
import { requireRouteAccess } from "@/lib/rbac/require-permission";
import { APP_ROLE_LABELS } from "@/lib/rbac/types";

export default async function RolesAdminPage() {
  try {
    const { role } = await requireRouteAccess("/settings/roles");
    return (
      <>
        <PageHeader
          title="Administración de roles clínicos"
          description={`Tu rol actual: ${APP_ROLE_LABELS[role]}. Asigná permisos RBAC al personal del research site.`}
        />
        <RoleAdminPanel />
      </>
    );
  } catch {
    redirect(config.auth.afterLoginUrl);
  }
}

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
          title="Usuarios y roles clínicos"
          description={`Tu rol: ${APP_ROLE_LABELS[role]}. Creá usuarios del sitio y asigná permisos RBAC al personal.`}
        />
        <RoleAdminPanel />
      </>
    );
  } catch {
    redirect(config.auth.afterLoginUrl);
  }
}

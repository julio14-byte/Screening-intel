import { PortalSettingsPanel } from "@/components/candidato/PortalSettingsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRouteAccess } from "@/lib/rbac/require-permission";
import { redirect } from "next/navigation";
import config from "@/config";

export default async function PortalSettingsPage() {
  try {
    await requireRouteAccess("/settings/portal");
    return (
      <>
        <PageHeader
          title="Portal de candidatos"
          description="Activa el pre-registro público, define el slug del centro y copia links para pacientes."
        />
        <PortalSettingsPanel />
      </>
    );
  } catch {
    redirect(config.auth.afterLoginUrl);
  }
}

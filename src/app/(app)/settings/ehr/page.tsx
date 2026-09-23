import { EhrSettingsPanel } from "@/components/ehr/EhrSettingsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRouteAccess } from "@/lib/rbac/require-permission";
import { redirect } from "next/navigation";
import config from "@/config";

export default async function EhrSettingsPage() {
  try {
    await requireRouteAccess("/settings/ehr");
    return (
      <>
        <PageHeader
          title="Ingreso EHR"
          description="Cargá pacientes del expediente a mano, por CSV o JSON. Sin webhooks."
        />
        <EhrSettingsPanel />
      </>
    );
  } catch {
    redirect(config.auth.afterLoginUrl);
  }
}

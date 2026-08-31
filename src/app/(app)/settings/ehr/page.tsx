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
          title="Integración EHR"
          description="Configura sync batch (Fase 1) y webhooks en tiempo real (Fase 2) con tu sistema hospitalario."
        />
        <EhrSettingsPanel />
      </>
    );
  } catch {
    redirect(config.auth.afterLoginUrl);
  }
}

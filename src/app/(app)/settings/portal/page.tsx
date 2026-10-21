import { PortalSettingsPanel } from "@/components/candidato/PortalSettingsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRouteAccess } from "@/lib/rbac/require-permission";
import { redirect } from "next/navigation";
import config from "@/config";

export default async function PortalSettingsPage() {
  const access = await requireRouteAccess("/settings/portal").catch(() => null);
  if (!access) redirect(config.auth.afterLoginUrl);

  return (
    <>
      <PageHeader title="Portal de candidatos" />
      <PortalSettingsPanel />
    </>
  );
}

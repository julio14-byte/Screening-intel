import { redirect } from "next/navigation";
import config from "@/config";
import { SiteProfilePanel } from "@/components/settings/SiteProfilePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRouteAccess } from "@/lib/rbac/require-permission";

export default async function SiteSettingsPage() {
  const access = await requireRouteAccess("/settings/site").catch(() => null);
  if (!access) redirect(config.auth.afterLoginUrl);

  return (
    <>
      <PageHeader title="Datos del centro" />
      <SiteProfilePanel />
    </>
  );
}

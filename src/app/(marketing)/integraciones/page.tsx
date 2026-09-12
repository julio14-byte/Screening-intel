import config from "@/config";
import { integrationsPage } from "@/config/trust";
import { MarketingDocPage } from "@/components/marketing/MarketingDocPage";
import { routes } from "@/lib/app/routes";

export const metadata = {
  title: `ETL e integraciones · ${config.app.name}`,
  description: integrationsPage.subtitle,
};

export default function IntegracionesPage() {
  return (
    <MarketingDocPage
      page={integrationsPage}
      related={[
        { href: routes.app.privacy, label: "Privacidad y regulaciones" },
        { href: routes.app.apiDocs, label: "API (Swagger)" },
      ]}
    />
  );
}

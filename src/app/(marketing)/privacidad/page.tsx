import config from "@/config";
import { privacyPage } from "@/config/trust";
import { MarketingDocPage } from "@/components/marketing/MarketingDocPage";
import { routes } from "@/lib/app/routes";

export const metadata = {
  title: `Privacidad y regulaciones · ${config.app.name}`,
  description: privacyPage.subtitle,
};

export default function PrivacidadPage() {
  return (
    <MarketingDocPage
      page={privacyPage}
      related={[
        { href: routes.app.integrations, label: "ETL e integraciones" },
        { href: routes.app.docs, label: "Documentación" },
      ]}
    />
  );
}

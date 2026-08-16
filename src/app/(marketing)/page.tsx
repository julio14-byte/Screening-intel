import config from "@/config";
import { LandingDocs } from "@/components/landing/LandingDocs";
import { LandingEnterApp } from "@/components/landing/LandingEnterApp";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingWaitlist } from "@/components/landing/LandingWaitlist";

/** Landing pública: info, documentación, waitlist, precios y acceso */
export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      <LandingDocs />
      {config.features.pricing ? <LandingPricing /> : null}
      {config.features.waitlist ? <LandingWaitlist /> : null}
      <LandingEnterApp />
    </>
  );
}

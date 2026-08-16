import config from "@/config";
import { LandingDocs } from "@/components/landing/LandingDocs";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingEnterApp } from "@/components/landing/LandingEnterApp";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingWaitlist } from "@/components/landing/LandingWaitlist";

/** Landing pública: info, docs, waitlist, Stripe y acceso a la app */
export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingDocs />
      {config.features.pricing ? <LandingPricing /> : null}
      {config.features.waitlist ? <LandingWaitlist /> : null}
      <LandingFAQ />
      <LandingEnterApp />
    </>
  );
}

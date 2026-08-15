import config from "@/config";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingEnterApp } from "@/components/landing/LandingEnterApp";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingWaitlist } from "@/components/landing/LandingWaitlist";

/** Landing pública: suscripciones + botón para entrar a la app */
export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      {config.features.pricing ? <LandingPricing /> : null}
      <LandingFeatures />
      <LandingFAQ />
      <LandingEnterApp />
      {config.features.waitlist ? <LandingWaitlist /> : null}
    </>
  );
}

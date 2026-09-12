import config from "@/config";
import { LandingDocs } from "@/components/landing/LandingDocs";
import { LandingEnterApp } from "@/components/landing/LandingEnterApp";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingTrust } from "@/components/landing/LandingTrust";
import { LandingWaitlist } from "@/components/landing/LandingWaitlist";

/** Landing pública: info, documentación, waitlist, precios y acceso */
export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      <LandingProblem />
      <LandingFeatures />
      <LandingTrust />
      <LandingDocs />
      {config.features.pricing ? <LandingPricing /> : null}
      <LandingTestimonials />
      <LandingFAQ />
      {config.features.waitlist ? <LandingWaitlist /> : null}
      <LandingFinalCta />
      <LandingEnterApp />
    </>
  );
}

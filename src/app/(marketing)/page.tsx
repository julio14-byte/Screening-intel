import config from "@/config";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingWaitlist } from "@/components/landing/LandingWaitlist";

/** Landing pública — patrón VibeFast: secciones modulares desde config.landing */
export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      <LandingProblem />
      <LandingFeatures />
      {config.features.pricing ? <LandingPricing /> : null}
      <LandingTestimonials />
      <LandingFAQ />
      <LandingFinalCta />
      {config.features.waitlist ? <LandingWaitlist /> : null}
    </>
  );
}

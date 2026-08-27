import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { TrustStatement } from "@/components/landing/TrustStatement";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SecurityGateOperations } from "@/components/landing/SecurityGateOperations";
import { ShortletPromo } from "@/components/landing/ShortletPromo";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { DemoCta } from "@/components/landing/DemoCta";

export function LandingPage() {
  return (
    <main className="flex-1">
      <LandingHeader />
      <Hero />
      <TrustStatement />
      <FeatureGrid />
      <HowItWorks />
      <SecurityGateOperations />
      <ShortletPromo />
      <SecuritySection />
      <DemoCta />
      <Footer />
    </main>
  );
}

import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { SecurityGateOperations } from "@/components/landing/SecurityGateOperations";
import { ShortletPromo } from "@/components/landing/ShortletPromo";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { DemoCta } from "@/components/landing/DemoCta";

export function LandingPage() {
  return (
    <main className="flex-1">
      <LandingHeader />
      <Hero />
      <FeatureGrid />
      <SecurityGateOperations />
      <ShortletPromo />
      <SecuritySection />
      <DemoCta />
      <Footer />
    </main>
  );
}

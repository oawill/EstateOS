import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { ShortletPromo } from "@/components/landing/ShortletPromo";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { DemoCta } from "@/components/landing/DemoCta";

export function LandingPage() {
  return (
    <main className="flex-1">
      <LandingHeader />
      <Hero />
      <FeatureGrid />
      <ShortletPromo />
      <SecuritySection />
      <DemoCta />
      <Footer />
    </main>
  );
}

import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { TrustStatement } from "@/components/landing/TrustStatement";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { SecurityGateOperations } from "@/components/landing/SecurityGateOperations";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BuiltFor } from "@/components/landing/BuiltFor";
import { ConnectedCommunications } from "@/components/landing/ConnectedCommunications";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { ShortletPromo } from "@/components/landing/ShortletPromo";
import { DemoCta } from "@/components/landing/DemoCta";

// Hero (incl. role-based preview + what NidraQ replaces)
// -> core operational capabilities (FeatureGrid, Security & Gate Ops)
// -> How NidraQ Works -> One Platform. Different Communities.
// -> connected communications -> Security & Trust -> Shortlet -> Request Demo
export function LandingPage() {
  return (
    <main className="flex-1">
      <LandingHeader />
      <Hero />
      <TrustStatement />
      <FeatureGrid />
      <SecurityGateOperations />
      <HowItWorks />
      <BuiltFor />
      <ConnectedCommunications />
      <SecuritySection />
      <ShortletPromo />
      <DemoCta />
      <Footer />
    </main>
  );
}

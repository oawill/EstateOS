import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "Advertise on NidraQ | Reach Local Communities",
  description:
    "Promote your business to relevant NidraQ residents, tenants and property owners through trusted, location-aware placements — never a resident database export.",
};

const FEATURES = [
  {
    title: "Reach Local Communities",
    body: "Target the estates, streets and cities where your customers actually live — not a generic, untargeted audience.",
  },
  {
    title: "Promote Special Offers",
    body: "Run a clearly-labeled Sponsored offer that residents can view, save or act on — never disguised as an estate announcement.",
  },
  {
    title: "Become a Featured Vendor",
    body: "Businesses already doing verified work through NidraQ can build on that reputation with featured placement.",
  },
  {
    title: "Measure Performance",
    body: "See impressions and clicks for your own campaigns — never resident names, phone numbers or house numbers.",
  },
] as const;

export default function AdvertisePage() {
  return (
    <main className="flex-1 bg-background">
      <LandingHeader />

      <section className="gradient-premium text-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">NidraQ for Business</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Reach customers where home life happens.</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Promote your business to relevant NidraQ communities through trusted, location-aware placements.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/advertiser">
              <Button type="button">Advertise on NidraQ</Button>
            </Link>
            <Link href="/advertiser" className="text-sm font-medium text-white/70 hover:text-white">
              Become a Verified Vendor →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Useful, not intrusive.</h2>
          <p className="mt-3 text-foreground-muted">
            Every placement is clearly labeled Sponsored, reviewed before it goes live, and never shown inside
            security, payment or emergency workflows. NidraQ never sells resident data — you select the audience and
            location criteria, and NidraQ serves eligible ads on your behalf.
          </p>
        </div>
      </section>

      <section className="gradient-premium py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to get started?</h2>
          <p className="mt-3 text-slate-300">Applications are reviewed by NidraQ before advertising is enabled.</p>
          <div className="mt-8">
            <Link href="/advertiser">
              <Button type="button">Advertise on NidraQ</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

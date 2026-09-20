import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button, Badge } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "NidraQ Resident App | Your Estate, In Your Pocket",
  description:
    "The NidraQ Resident App lets people living in NidraQ-managed estates invite visitors, pay bills, report issues and stay connected with their community — all from their phone.",
};

const FEATURES = [
  {
    title: "Visitor Passes",
    body: "Create a secure digital gate pass for a guest, delivery or recurring visitor in under 20 seconds, and share it by WhatsApp or SMS.",
    icon: <PassIcon />,
  },
  {
    title: "Estate Payments",
    body: "See exactly what's due — service charge, utilities, security levy — and pay in a few taps with a receipt you can download or share.",
    icon: <PayIcon />,
  },
  {
    title: "Maintenance Requests",
    body: "Report a problem with photos and track it from submitted to resolved, without a single phone call to the estate office.",
    icon: <ToolIcon />,
  },
  {
    title: "Community Updates",
    body: "Estate announcements, events and a resident marketplace, kept in one feed instead of a scattered WhatsApp group.",
    icon: <MegaphoneIcon />,
  },
  {
    title: "Security",
    body: "Every visitor pass and gate entry is logged, and emergency contacts are one tap away when something needs urgent attention.",
    icon: <ShieldIcon />,
  },
] as const;

const JOURNEY = ["Visitors", "Gate Pass", "Payments", "Maintenance", "Announcements", "Community"] as const;

export default function ResidentAppPage() {
  return (
    <main className="flex-1 bg-background">
      <LandingHeader />

      {/* ============================== HERO ============================== */}
      <section className="gradient-premium text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">A NidraQ Product</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Your estate.
              <br /> Right in your pocket.
            </h1>
            <p className="mt-4 max-w-lg text-slate-300">
              Visitors, payments, maintenance, community updates and estate services — all from NidraQ.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button type="button">Resident Sign In</Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Is your estate not on NidraQ?{" "}
              <a href="mailto:hello@nidraq.com?subject=Bring%20NidraQ%20to%20my%20estate" className="font-medium text-white underline hover:text-primary-light">
                Tell your estate manager
              </a>
            </p>
          </div>

          {/* Phone mockup — mirrors the real /[estateSlug]/dashboard resident home. */}
          <div className="flex justify-center">
            <div className="w-72 rounded-[2rem] border-8 border-navy bg-surface p-3 text-foreground shadow-2xl">
              <div className="rounded-2xl bg-surface-muted p-4">
                <p className="text-sm font-semibold">Good morning, Bowe</p>
                <p className="text-xs text-foreground-muted">Palm Grove Estate · House 18B</p>

                <div className="mt-3 rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">Your Home</p>
                    <Badge tone="success">All Good</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <MiniTile label="Service Charges" value="Paid ✓" />
                    <MiniTile label="Open Maintenance" value="1" />
                    <MiniTile label="Visitors Today" value="2" />
                    <MiniTile label="Next Payment" value="Oct 1" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px] font-medium">
                  {["Invite Visitor", "Pay Bill", "Report Issue", "Emergency"].map((a) => (
                    <div key={a} className="rounded-lg border border-border bg-surface px-1 py-2">
                      {a}
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-border bg-surface p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">Estate Updates</p>
                  <p className="mt-1 text-xs font-medium">Water Maintenance</p>
                  <p className="text-[11px] text-foreground-muted">Water supply will be temporarily unavailable...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Everything you need from your estate</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">{f.icon}</div>
              <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== JOURNEY ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Most estate tasks, in seconds</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-foreground-muted">
            You shouldn&apos;t have to call the estate office or send a WhatsApp message for routine estate services.
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {JOURNEY.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">{step}</span>
                {i < JOURNEY.length - 1 && <span className="text-foreground-muted">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="gradient-premium py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">My home and my estate, in one app.</h2>
          <p className="mt-3 text-slate-300">Ask your estate manager to get you set up on NidraQ.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button type="button">Resident Sign In</Button>
            </Link>
            <a href="mailto:hello@nidraq.com?subject=Bring%20NidraQ%20to%20my%20estate">
              <Button type="button" variant="secondary">
                Tell Your Estate Manager
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted px-2 py-1.5">
      <p className="text-[9px] text-foreground-muted">{label}</p>
      <p className="text-[11px] font-semibold">{value}</p>
    </div>
  );
}

function PassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function ToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-.8-.8-2.8 2.6-2.6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4L6 9H5a2 2 0 0 0-2 2Z" strokeLinejoin="round" />
      <path d="M14 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14" strokeLinecap="round" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

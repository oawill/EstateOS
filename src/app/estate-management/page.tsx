import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button, Badge } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "NidraQ Estate Management | The Estate Operating System",
  description:
    "Run your entire estate from one platform. Residents, visitor security, service charges, utilities, maintenance and community operations — connected through NidraQ.",
};

const FEATURES = [
  { title: "Resident Management", body: "A full resident directory, occupancy history and household relationships — kept distinct from tenants and shortlet guests." },
  { title: "Visitor & Gate Security", body: "Digital gate passes, QR scanning, walk-in approvals and a live gate activity feed, connected to the Security & Gate App." },
  { title: "Service Charges", body: "Bill, collect and reconcile service charges with a real financial ledger — never a spreadsheet." },
  { title: "Utilities", body: "Electricity, water, generator and diesel tracking, scoped to what each estate actually has configured." },
  { title: "Maintenance", body: "One shared work-order engine for private units and common estate assets, with vendors and status tracking." },
  { title: "Community", body: "Announcements, events and a resident marketplace — moderated, never an uncontrolled social feed." },
] as const;

const AUDIENCES = [
  { title: "Estate Managers", body: "See collections, requests, security and maintenance in one command center instead of five spreadsheets." },
  { title: "Estate Management Companies", body: "Run every estate you manage from one login, with authorization scoped to what each staff member is assigned to." },
  { title: "Facility & Security Teams", body: "Maintenance gets a real work-order queue; security gets a digital gatehouse — each with exactly the access they need." },
  { title: "Finance Staff", body: "Collections, outstanding balances and expenses, reconciled from the same ledger residents pay into." },
] as const;

export default function EstateManagementPage() {
  return (
    <main className="flex-1 bg-background">
      <LandingHeader />

      {/* ============================== HERO ============================== */}
      <section className="gradient-premium text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">A NidraQ Product</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Run your entire estate from one platform.</h1>
            <p className="mt-4 max-w-lg text-slate-300">
              Residents, security, service charges, utilities, maintenance and community operations — connected
              through NidraQ.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/request-demo">
                <Button type="button">Request a Demo</Button>
              </Link>
              <a href="#features" className="text-sm font-medium text-white/70 hover:text-white">
                Explore Estate Management →
              </a>
            </div>
          </div>

          {/* Command Center preview — same layout as the real /[estateSlug]/dashboard admin home. */}
          <div className="rounded-2xl border border-white/10 bg-surface p-5 text-foreground shadow-2xl sm:p-6">
            <p className="text-sm font-semibold">Good morning, Adaeze</p>
            <p className="text-xs text-foreground-muted">Here&apos;s what&apos;s happening across Palm Grove Estate today.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Collected" value="₦12.5M" tone="success" />
              <MiniStat label="Outstanding" value="₦1.85M" tone="warning" />
              <MiniStat label="Occupied" value="142/150" />
              <MiniStat label="Open Requests" value="6" tone="warning" />
              <MiniStat label="Visitors Today" value="12" />
              <MiniStat label="Incidents" value="1" tone="danger" />
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Needs Your Attention</p>
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-xs">
                <p className="font-semibold">3 Overdue Service Charges</p>
                <p className="text-foreground-muted">Total outstanding: ₦420,000</p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-xs">
                <p className="font-semibold">Water Pump Maintenance Overdue</p>
                <p className="text-foreground-muted">Scheduled yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BUILT FOR ==================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built for every kind of estate operator</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="font-semibold tracking-tight">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features" className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Everything an estate needs, connected</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-medium tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CONNECTED PRODUCTS ==================== */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One estate, three connected experiences</h2>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3">
          {["Estate Manager Command Center", "Resident App", "Security & Gate App"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-3">
              <Badge tone="info">{step}</Badge>
              {i < arr.length - 1 && <span className="text-foreground-muted">↔</span>}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-foreground-muted">
          A manager creates a service charge, the resident sees it and pays, and collections update on the manager&apos;s
          dashboard automatically. Security records a visitor entry, and it appears in the estate&apos;s gate activity —
          all from the same authoritative records, never a duplicate database.
        </p>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="gradient-premium py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The estate operating system.</h2>
          <p className="mt-3 text-slate-300">Money, residents, security, maintenance and community — in one place.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/request-demo">
              <Button type="button">Request a Demo</Button>
            </Link>
            <Link href="/signup">
              <Button type="button" variant="secondary">
                Create your Estate account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-lg bg-surface-muted px-2 py-2 text-center">
      <p className={`text-sm font-semibold ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-foreground-muted">{label}</p>
    </div>
  );
}

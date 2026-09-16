import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "NidraQ Tenant Management | Property, Lease & Rent Operations",
  description:
    "NidraQ Tenant Management gives individual landlords, diaspora owners, property managers and real estate companies one platform for properties, leases, rent collection and maintenance across Nigeria.",
};

const AUDIENCES = [
  { title: "Individual Landlords", body: "Track every property, tenant and lease in one place instead of spreadsheets and WhatsApp threads." },
  { title: "Diaspora Landlords", body: "Manage Nigerian property from anywhere — see rent collected, outstanding balances and maintenance without being on the ground." },
  { title: "Property Managers", body: "Run every property you're assigned to from one dashboard, with access scoped only to what you manage." },
  { title: "Real Estate Companies", body: "Operate a full portfolio across many owners, properties and units, with statements ready for every landlord." },
] as const;

const FEATURES = [
  { title: "Property & Unit Portfolio", body: "Owners, properties and rental units in one hierarchy — apartments, duplexes, detached houses, commercial and mixed-use." },
  { title: "Leases That Respect Nigerian Rent", body: "Monthly, quarterly, semi-annual or annual payment terms — renewals create a new lease record, never overwrite history." },
  { title: "Rent Ledger & Partial Payments", body: "Every rent period is tracked separately from payments received, so partial payments are always visible, never hidden behind a paid/unpaid flag." },
  { title: "Arrears & Lease Expiry Tracking", body: "See overdue rent grouped by age and leases expiring in 30, 60 or 90 days before they become a problem." },
  { title: "Maintenance Workflow", body: "Tenants report issues with photos; managers assign vendors and track cost through to landlord statements." },
  { title: "Landlord Statements", body: "Monthly income, expenses and net position per property or owner — reconciled directly from the payment and expense ledger." },
] as const;

export default function TenantManagementPage() {
  return (
    <main className="flex-1">
      <LandingHeader />

      <section className="gradient-premium text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">A NidraQ Product</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">NidraQ Tenant Management</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            The operating platform for Nigerian rental properties — properties, tenants, leases, rent and
            maintenance, built for individual landlords, diaspora owners, property managers and real estate
            companies alike.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button type="button">Get Started</Button>
            </Link>
            <Link href="/request-demo">
              <Button type="button" variant="secondary">
                Request a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Built for every kind of owner</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h3 className="font-medium tracking-tight">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-muted py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight">What&apos;s included</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-medium tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">One platform, three connected products</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
          NidraQ Estate Management, NidraQ Tenant Management and NidraQ Shortlets are separate modules on a shared
          NidraQ platform — not three disconnected applications. A landlord, resident or manager never needs more
          than one login.
        </p>
        <div className="mt-8">
          <Link href="/signup">
            <Button type="button">Create your Tenant Management account</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

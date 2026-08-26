import Image from "next/image";
import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";

const FEATURES = [
  {
    title: "Properties & residents",
    description: "Blocks, streets, zones, units, and occupancy — owners and tenants tracked with move-in/move-out history.",
    accent: "text-primary bg-primary/10",
  },
  {
    title: "Billing & payments",
    description: "Charges, invoices, Paystack and manual bank-transfer payments, and receipts — one pipeline for every payment type.",
    accent: "text-success bg-success/10",
  },
  {
    title: "Visitors & Gate Mode",
    description: "QR and PIN visitor passes, fast security check-in/out, and an override path with a required reason.",
    accent: "text-cyan bg-cyan/10",
  },
  {
    title: "Maintenance & vendors",
    description: "Report, assign, resolve, and confirm — with a vendor directory and resident sign-off on every ticket.",
    accent: "text-warning bg-warning/10",
  },
  {
    title: "Utilities",
    description: "Manual meter readings that bill consumption automatically through the same invoice and payment pipeline.",
    accent: "text-primary bg-primary/10",
  },
  {
    title: "Announcements",
    description: "Targeted announcements with an in-app notification inbox for every resident who needs to see them.",
    accent: "text-cyan bg-cyan/10",
  },
] as const;

const TRUST_POINTS = [
  {
    title: "Your data stays yours",
    description: "Every estate's data is isolated at the database layer — there's no code path that can read or write another estate's records.",
  },
  {
    title: "The right access for every role",
    description: "Admins, finance, facility managers, security, residents, and vendors each see only what their role allows.",
  },
  {
    title: "A record of every change",
    description: "Who did what, and when, is logged automatically — so there's always an answer when a resident or board member asks.",
  },
] as const;

export function LandingPage() {
  return (
    <main className="flex-1">
      <div className="gradient-premium text-white">
        <header>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="EstateOS" width={32} height={32} className="rounded-md" />
              <span className="text-sm font-semibold">EstateOS</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-200 hover:text-white">
                Sign in
              </Link>
              <Link href="/signup">
                <Button type="button" className="!bg-white !text-navy hover:!bg-slate-100">
                  Request a Demo
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Run Your Entire Community From One Platform.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">
            Manage residents, payments, visitors, security, utilities, maintenance and communication with EstateOS.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button type="button" className="!bg-white !text-navy hover:!bg-slate-100">
                Request a Demo
              </Button>
            </Link>
            <Link href="#features">
              <Button
                type="button"
                variant="secondary"
                className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10"
              >
                Explore EstateOS
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${feature.accent}`}>
                {feature.title.charAt(0)}
              </span>
              <p className="mt-3 font-medium">{feature.title}</p>
              <p className="mt-1.5 text-sm text-foreground-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Built to be trusted with estate records</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <div key={point.title}>
                <p className="font-medium">{point.title}</p>
                <p className="mt-1.5 text-sm text-foreground-muted">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to run your estate on EstateOS?</h2>
        <div className="mt-6">
          <Link href="/signup">
            <Button type="button">Request a Demo</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-sm text-foreground-muted">
          <p>© {new Date().getFullYear()} EstateOS</p>
          <Link href="/login" className="font-medium text-foreground-muted hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}

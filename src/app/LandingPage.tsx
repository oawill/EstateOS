import Image from "next/image";
import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";

const FEATURES = [
  {
    title: "Properties & residents",
    description: "Blocks, streets, zones, units, and occupancy — owners and tenants tracked with move-in/move-out history.",
  },
  {
    title: "Billing & payments",
    description: "Charges, invoices, Paystack and manual bank-transfer payments, and receipts — one pipeline for every payment type.",
  },
  {
    title: "Visitors & Gate Mode",
    description: "QR and PIN visitor passes, fast security check-in/out, and an override path with a required reason.",
  },
  {
    title: "Maintenance & vendors",
    description: "Report, assign, resolve, and confirm — with a vendor directory and resident sign-off on every ticket.",
  },
  {
    title: "Utilities",
    description: "Manual meter readings that bill consumption automatically through the same invoice and payment pipeline.",
  },
  {
    title: "Announcements",
    description: "Targeted announcements with an in-app notification inbox for every resident who needs to see them.",
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
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="EstateOS" width={32} height={32} className="rounded-md" />
            <span className="text-sm font-semibold">EstateOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/signup">
              <Button type="button">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The operating system for modern Nigerian estates
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Billing, payments, visitors, maintenance, utilities, and announcements — one platform for every estate,
          isolated by tenant and built around who&apos;s actually allowed to do what.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button type="button">Get started</Button>
          </Link>
          <Link href="/login">
            <Button type="button" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <p className="font-medium">{feature.title}</p>
              <p className="mt-1.5 text-sm text-slate-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Built to be trusted with estate records</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <div key={point.title}>
                <p className="font-medium">{point.title}</p>
                <p className="mt-1.5 text-sm text-slate-600">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to run your estate on EstateOS?</h2>
        <div className="mt-6">
          <Link href="/signup">
            <Button type="button">Get started</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} EstateOS</p>
          <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}

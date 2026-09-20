import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button, Badge } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "NidraQ Tenant Management | Property, Lease & Rent Operations",
  description:
    "NidraQ Tenant Management gives individual landlords, diaspora owners, property managers and real estate companies one platform for properties, leases, rent collection and maintenance across Nigeria.",
};

const SUBNAV = [
  { href: "#overview", label: "Overview" },
  { href: "#owners", label: "Owners" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/request-demo", label: "Demo" },
] as const;

const AUDIENCES = [
  {
    title: "Individual Landlords",
    body: "Track every property, tenant and lease in one place instead of spreadsheets and WhatsApp threads.",
    icon: <HomeIcon />,
  },
  {
    title: "Diaspora Landlords",
    body: "Manage Nigerian property from anywhere — see rent collected, outstanding balances and maintenance without being on the ground.",
    icon: <GlobeIcon />,
  },
  {
    title: "Property Managers",
    body: "Run every property you're assigned to from one dashboard, with access scoped only to what you manage.",
    icon: <UsersIcon />,
  },
  {
    title: "Real Estate Companies",
    body: "Operate a full portfolio across many owners, properties and units, with statements ready for every landlord.",
    icon: <BuildingIcon />,
  },
] as const;

const FEATURES = [
  {
    title: "Property & Unit Portfolio",
    body: "Owners, properties and rental units in one hierarchy — apartments, duplexes, detached houses, commercial and mixed-use.",
    icon: <BuildingIcon />,
  },
  {
    title: "Leases That Respect Nigerian Rent",
    body: "Monthly, quarterly, semi-annual or annual payment terms — renewals create a new lease record, never overwrite history.",
    icon: <DocumentIcon />,
  },
  {
    title: "Rent Ledger & Partial Payments",
    body: "Every rent period is tracked separately from payments received, so partial payments are always visible, never hidden behind a paid/unpaid flag.",
    icon: <CardIcon />,
  },
  {
    title: "Arrears & Lease Expiry Tracking",
    body: "See overdue rent grouped by age and leases expiring in 30, 60 or 90 days before they become a problem.",
    icon: <ClockIcon />,
  },
  {
    title: "Maintenance Workflow",
    body: "Tenants report issues with photos; managers assign vendors and track cost through to landlord statements.",
    icon: <WrenchIcon />,
  },
  {
    title: "Landlord Statements",
    body: "Monthly income, expenses and net position per property or owner — reconciled directly from the payment and expense ledger.",
    icon: <ChartIcon />,
  },
] as const;

const TRUST_BADGES = [
  { icon: <ShieldIcon />, label: "Secure & Reliable" },
  { icon: <MapPinIcon />, label: "Built for Nigeria" },
  { icon: <UsersIcon />, label: "Trusted by landlords and property managers" },
] as const;

export default function TenantManagementPage() {
  return (
    <main className="flex-1 bg-background">
      <LandingHeader />

      <div className="sticky top-0 z-20 hidden border-b border-border bg-surface/95 backdrop-blur sm:block">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5 text-sm font-medium text-foreground-muted" aria-label="Tenant Management sections">
          {SUBNAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </a>
          ))}
          <Link href="/signup" className="ml-auto">
            <Button type="button" className="px-3 py-1.5 text-sm">
              Get Started
            </Button>
          </Link>
        </nav>
      </div>

      {/* ============================== HERO ============================== */}
      <section id="overview" className="gradient-premium text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">A NidraQ Product</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">NidraQ Tenant Management</h1>
            <p className="mt-4 max-w-lg text-slate-300">
              The complete platform for Nigerian rental properties — properties, tenants, leases, rent, maintenance
              and owner statements.
            </p>
            <p className="mt-3 max-w-lg text-sm text-slate-400">
              Built for individual landlords, diaspora owners, property managers and real estate companies.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button type="button">Get Started</Button>
              </Link>
              <Link href="/request-demo">
                <Button type="button" variant="secondary">
                  Request a Demo
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6">
              {TRUST_BADGES.map((b) => (
                <span key={b.label} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <span className="text-primary-light">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard preview — mirrors the real /dashboard/tenants overview's KPI strip and recent activity, not a fabricated feature set. */}
          <div className="rounded-2xl border border-white/10 bg-surface p-5 text-foreground shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Good morning, Bewe</p>
                <p className="text-xs text-foreground-muted">Here&apos;s what&apos;s happening across your properties today.</p>
              </div>
              <Badge tone="neutral">
                <span className="whitespace-nowrap">All Properties</span>
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="Rent Collected" value="₦12.5M" delta="+8%" />
              <MiniStat label="Occupancy" value="92%" delta="+3%" />
              <MiniStat label="Active Tenants" value="48" />
              <MiniStat label="Leases Expiring" value="6" hint="next 60 days" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Rent Collection</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "conic-gradient(var(--color-success) 0% 87%, var(--color-surface-muted) 87% 100%)" }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xs font-semibold">87%</div>
                  </div>
                  <div className="text-xs">
                    <p className="font-medium text-success">₦12,500,000 collected</p>
                    <p className="text-foreground-muted">₦1,850,000 outstanding</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3 text-xs">
                <p className="font-medium uppercase tracking-wide text-foreground-muted">Needs Your Attention</p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex justify-between">
                    <span>3 overdue payments</span>
                    <span className="font-medium text-danger">₦1,050,000</span>
                  </li>
                  <li className="flex justify-between">
                    <span>2 maintenance requests</span>
                    <span className="font-medium text-warning">Awaiting approval</span>
                  </li>
                  <li className="flex justify-between">
                    <span>1 lease expiring</span>
                    <span className="font-medium text-foreground-muted">in 14 days</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Recent Payments</p>
              {[
                { name: "Tolu Adeyemi", unit: "Lekki Gardens · Unit 2A", amount: "₦350,000" },
                { name: "Michael Okafor", unit: "Victoria Court · 3B", amount: "₦420,000" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-foreground-muted">{p.unit}</p>
                  </div>
                  <p className="font-semibold">{p.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BUILT FOR EVERY KIND OF OWNER ==================== */}
      <section id="owners" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary">Designed for Nigerian property owners</p>
        <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built for every kind of owner</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-foreground-muted">
          Whether you own one property or manage hundreds, NidraQ adapts to your rental business.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                {a.icon}
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== WHAT'S INCLUDED ==================== */}
      <section id="features" className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">What&apos;s included</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-foreground-muted">
            Everything you need to manage rental properties professionally.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{f.icon}</div>
                <div>
                  <h3 className="font-medium tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ONE PLATFORM ==================== */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One platform, three connected products</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
          NidraQ Estate Management, NidraQ Tenant Management and NidraQ Shortlet Management are separate modules on
          a shared NidraQ platform — not three disconnected applications. A landlord, resident or manager never
          needs more than one login.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button type="button">Create your Tenant Management account</Button>
          </Link>
          <Link href="/request-demo">
            <Button type="button" variant="secondary">
              Request a Demo
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function MiniStat({ label, value, delta, hint }: { label: string; value: string; delta?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[11px] text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
      {delta && <p className="mt-1 text-[11px] font-medium text-success">▲ {delta}</p>}
      {hint && <p className="mt-1 text-[11px] text-foreground-muted">{hint}</p>}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M22 21c0-2.8-1.8-5-4.5-5.7" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16M13 21v-9a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7h.01M7 11h.01M7 15h.01M17 13h.01M17 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h2" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-.8-.8-2.8 2.6-2.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

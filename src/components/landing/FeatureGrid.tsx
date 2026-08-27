import Link from "next/link";
import { Card } from "@/components/shared/ui";

const FEATURES = [
  {
    title: "Finance & Payments",
    description: "Service charges, recurring billing, arrears, receipts, payment reconciliation and financial reporting.",
    icon: (
      <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Residents & Properties",
    description: "Residents, owners, tenants, households, units, buildings and occupancy records.",
    icon: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Security & Gate Operations",
    description: "Visitors, vehicles, staff, contractors, deliveries and incident management — full gatehouse control.",
    icon: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Maintenance & Facilities",
    description: "Maintenance requests, work orders, assignments, vendors, status updates and maintenance history.",
    icon: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Utilities",
    description: "Electricity, water, diesel, generators, meter readings, consumption and utility billing.",
    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Community",
    description: "Announcements, notices, events, complaints, discussions and community engagement.",
    icon: <path d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />,
  },
] as const;

const HIERARCHY = ["Property", "People", "Money", "Access", "Utilities", "Maintenance", "Communication"] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Everything you need</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Powerful Features. Seamless Operations.</h2>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-foreground-muted">
          <span className="font-medium text-foreground">EstateOS manages</span>
          {HIERARCHY.map((item, i) => (
            <span key={item} className="flex items-center gap-1.5">
              {item}
              {i < HIERARCHY.length - 1 && (
                <span aria-hidden="true" className="text-border">
                  →
                </span>
              )}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Link key={feature.title} href="/login" className="group block h-full focus-visible:outline-none">
            <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary/50">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  {feature.icon}
                </svg>
              </span>
              <p className="mt-3 font-medium">{feature.title}</p>
              <p className="mt-1.5 text-sm text-foreground-muted">{feature.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

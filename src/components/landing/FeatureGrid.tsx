import Link from "next/link";
import { Card } from "@/components/shared/ui";

const FEATURES = [
  {
    title: "Payments & Billing",
    description: "Collect and reconcile service charges and other payments — Paystack and manual bank transfer, one pipeline.",
    icon: (
      <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Residents & Units",
    description: "Manage residents, owners, tenants, properties, units, vehicles, and important community information.",
    icon: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Visitors & Access",
    description: "Visitor invitations, QR/PIN access, and fast gate-management check-in and check-out workflows.",
    icon: <path d="M12 15a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Maintenance",
    description: "Report, assign, track, and resolve community maintenance issues from a single shared queue.",
    icon: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Utilities",
    description: "Manage electricity, water, generator/diesel, and other shared utility operations and billing.",
    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Community",
    description: "Announcements, events, private community discussions, and classifieds — all in one estate feed.",
    icon: <path d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />,
  },
] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Everything you need</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Powerful Features. Seamless Operations.</h2>
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

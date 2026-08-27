import Link from "next/link";
import { Card } from "@/components/shared/ui";

interface CustomerType {
  title: string;
  description: string;
  highlights: readonly string[];
  cta?: { label: string; href: string };
}

// Every highlight maps to a real, shipped capability (billing, gate
// operations, maintenance, community, multi-tenant estate isolation,
// Shortlet) — nothing here describes functionality that doesn't exist.
const CUSTOMER_TYPES: CustomerType[] = [
  {
    title: "Residential Estates",
    description: "For gated residential estates and managed communities.",
    highlights: ["Residents", "Service charges", "Security", "Visitors", "Utilities", "Maintenance", "Announcements"],
  },
  {
    title: "Property Managers",
    description: "For organizations managing multiple communities or buildings.",
    highlights: ["Multiple communities", "Portfolio visibility", "Centralized operations", "Finance", "Maintenance", "Reporting", "Staff access"],
  },
  {
    title: "Apartment Buildings",
    description: "For apartment blocks and multi-unit residential properties.",
    highlights: ["Units", "Residents", "Shared facilities", "Access", "Billing", "Maintenance", "Communication"],
  },
  {
    title: "Gated Communities",
    description: "For communities where controlled entry is central to daily operations.",
    highlights: ["Gate operations", "Visitors", "Vehicles", "Domestic staff", "Contractors", "Security incidents", "Resident approvals"],
  },
  {
    title: "Mixed-Use Developments",
    description: "For developments combining residential, commercial and shared-facility spaces.",
    highlights: ["Residential units", "Commercial units", "Offices", "Retail", "Shared facilities"],
  },
  {
    title: "HOA / Community Associations",
    description: "For homeowner and community associations coordinating shared operations.",
    highlights: ["Dues", "Residents / homeowners", "Community communications", "Maintenance", "Amenities", "Access"],
  },
  {
    title: "Serviced Apartments & Shortlets",
    description: "For shortlet owners and serviced-apartment operators — a dedicated product experience.",
    highlights: ["Reservations", "Guests", "Housekeeping", "Shortlet maintenance"],
    cta: { label: "Explore EstateOS Shortlet", href: "/#shortlet" },
  },
];

export function BuiltFor() {
  return (
    <section className="border-y border-border bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Who it&apos;s for</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">One Platform. Different Communities.</h2>
          <p className="mt-4 text-foreground-muted">
            EstateOS adapts to the way different communities, properties and operators work — while keeping people,
            payments, access and operations connected.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMER_TYPES.map((type) => (
            <Card key={type.title} className="flex h-full flex-col">
              <p className="font-medium">{type.title}</p>
              <p className="mt-1.5 text-sm text-foreground-muted">{type.description}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {type.highlights.map((item) => (
                  <li key={item} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground-muted">
                    {item}
                  </li>
                ))}
              </ul>
              {type.cta && (
                <Link href={type.cta.href} className="mt-4 text-sm font-medium text-primary hover:underline">
                  {type.cta.label} →
                </Link>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

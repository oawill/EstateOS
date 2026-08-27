import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";

export function ShortletPromo() {
  return (
    <section id="shortlet" className="border-y border-border bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-foreground-muted">Also powering your shortlet business.</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              EstateOS <span className="text-primary">Shortlet</span>
            </h2>
            <p className="mt-4 max-w-lg text-foreground-muted">
              Manage reservations, guests, payments, housekeeping, maintenance, and property operations from one
              platform — a dedicated module for shortlet owners and serviced-apartment operators, kept separate from
              standard community management.
            </p>
            <div className="mt-6">
              <Link href="/request-demo">
                <Button type="button">Explore Shortlet</Button>
              </Link>
            </div>
          </div>

          <Card className="border-navy/10">
            <p className="text-sm font-medium text-foreground-muted">Upcoming check-in</p>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="font-medium">Ocean View Apartments — Unit 1A</p>
                <p className="mt-0.5 text-sm text-foreground-muted">Today, 3:00 PM · 2 guests · 3 nights</p>
              </div>
              <Badge tone="success">Confirmed</Badge>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";

const CAPABILITIES = [
  "Gate dashboard",
  "Visitor verification",
  "QR code validation",
  "Visitor PIN validation",
  "Resident approval",
  "Vehicle registry",
  "Domestic staff access",
  "Contractor access",
  "Vendor access",
  "Delivery access",
  "Entry and exit logging",
  "Incident logging",
  "Emergency contacts",
  "Security shift handover",
  "Search resident / unit",
  "Access history",
] as const;

export function SecurityGateOperations() {
  return (
    <section id="security-gate" className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground-muted">A core EstateOS capability.</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Security & Gate Operations</h2>
          <p className="mt-4 max-w-lg text-foreground-muted">
            Give your security team the tools to control access confidently. Verify visitors, manage vehicles,
            authorize staff and contractors, record incidents, and maintain a complete digital access history — all
            from one gate dashboard.
          </p>
          <div className="mt-6">
            <Link href="/request-demo">
              <Button type="button">Request a Demo</Button>
            </Link>
          </div>
        </div>

        <Card className="border-navy/10">
          <p className="text-sm font-medium text-foreground-muted">Gate — Main Entrance</p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="font-medium">Visitor checked in — Unit 14B</p>
              <p className="mt-0.5 text-sm text-foreground-muted">QR verified · 2 min ago</p>
            </div>
            <Badge tone="success">Inside</Badge>
          </div>
        </Card>
      </div>

      <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-foreground-muted">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

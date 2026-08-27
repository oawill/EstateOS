import Link from "next/link";
import { Badge, Button, Card, Input, Label, Select } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { TICKET_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import { getMaintenanceSummary, isOverdue, listAllTickets } from "@/server/modules/maintenance/service";
import { listVendors } from "@/server/modules/vendors/service";
import { createVendorAction } from "./actions";

const CATEGORIES = [
  "ELECTRICITY",
  "GENERATOR",
  "PLUMBING",
  "WATER",
  "SECURITY",
  "ROADS",
  "DRAINAGE",
  "WASTE",
  "LANDSCAPING",
  "BUILDING",
  "OTHER",
] as const;

export default async function FacilityPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "maintenance:*"));

  const [summary, tickets, vendors] = await Promise.all([
    getMaintenanceSummary(membership.estateId),
    listAllTickets(membership.estateId),
    listVendors(membership.estateId),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Facility</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-2xl font-semibold">{summary.openCount}</p>
          <p className="mt-1 text-sm text-slate-500">Open tickets</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold">{summary.overdueCount}</p>
          <p className="mt-1 text-sm text-slate-500">Overdue tickets</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Tickets</h2>
        {tickets.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No maintenance tickets yet.</p>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Link key={ticket.id} href={`/${estateSlug}/facility/${ticket.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {ticket.ticketNumber} · {ticket.category.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {ticket.resident
                        ? `${ticket.resident.firstName} ${ticket.resident.lastName}`
                        : `Shortlet — ${ticket.shortletUnit?.property.name} (${ticket.shortletUnit?.unitLabel})`}{" "}
                      · {formatDate(ticket.createdAt)}
                      {isOverdue(ticket) && <span className="font-medium text-danger"> · OVERDUE</span>}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Vendors</h2>
        <Card>
          {vendors.length === 0 ? (
            <p className="text-sm text-slate-400">No vendors yet.</p>
          ) : (
            <ul className="space-y-2">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="text-sm text-slate-700">
                  {vendor.name}
                  {vendor.category ? ` · ${vendor.category.replaceAll("_", " ")}` : ""}
                  {vendor.phone ? ` · ${vendor.phone}` : ""}
                </li>
              ))}
            </ul>
          )}
          <form
            action={async (formData) => {
              "use server";
              await createVendorAction(estateSlug, {}, formData);
            }}
            className="mt-4 grid grid-cols-2 gap-3"
          >
            <div className="col-span-2">
              <Label htmlFor="vendorName" className="sr-only">
                Vendor name
              </Label>
              <Input id="vendorName" name="name" required placeholder="Vendor name" />
            </div>
            <Input name="contactName" placeholder="Contact name" />
            <Input name="phone" placeholder="Phone" />
            <Input name="email" type="email" placeholder="Email" />
            <Select name="category" defaultValue="">
              <option value="">Category (optional)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" className="col-span-2">
              Add vendor
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}

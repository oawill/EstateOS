import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listVendors } from "@/server/modules/vendors/service";
import { toggleVendorApprovedAction } from "./actions";
import { VendorForm } from "./VendorForm";

export default async function VendorsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const vendors = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "vendors:*");
    return listVendors(membership.estateId);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Vendors</h1>
      <p className="text-sm text-foreground-muted">
        Your vendor directory — contractors, technicians, and service providers, with approval status and contract
        dates in one place instead of scattered across maintenance requests.
      </p>

      <div className="space-y-3">
        {vendors.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No vendors yet.</p>
          </Card>
        )}
        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{vendor.name}</p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {vendor.category ? vendor.category.replaceAll("_", " ") : "No category"}
                  {vendor.contactName ? ` · ${vendor.contactName}` : ""}
                  {vendor.phone ? ` · ${vendor.phone}` : ""}
                  {vendor.email ? ` · ${vendor.email}` : ""}
                </p>
                {(vendor.contractStartDate || vendor.contractEndDate) && (
                  <p className="mt-1 text-xs text-foreground-muted">
                    Contract: {vendor.contractStartDate ? formatDate(vendor.contractStartDate) : "—"} to{" "}
                    {vendor.contractEndDate ? formatDate(vendor.contractEndDate) : "—"}
                  </p>
                )}
                {vendor.notes && <p className="mt-1 text-xs text-foreground-muted">{vendor.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={vendor.isApproved ? "success" : "neutral"}>
                  {vendor.isApproved ? "Approved" : "Not approved"}
                </Badge>
                <form
                  action={async () => {
                    "use server";
                    await toggleVendorApprovedAction(estateSlug, vendor.id, !vendor.isApproved);
                  }}
                >
                  <Button type="submit" variant="secondary">
                    {vendor.isApproved ? "Mark unapproved" : "Approve"}
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium text-foreground-muted">Add vendor</p>
        <VendorForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";

export default async function OwnerPortfolioPage() {
  const { user } = await guardPage(async () => requirePropertyOwner(await requireUser()));
  const properties = await listAccessibleProperties(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Portfolio</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {properties.length} propert{properties.length === 1 ? "y" : "ies"} · {properties.reduce((sum, p) => sum + p.units.length, 0)} unit(s)
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <p className="font-medium">No properties yet</p>
          <p className="mt-1 text-sm text-foreground-muted">Properties assigned to your NidraQ account will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const occupiedUnits = property.units.filter((u) => u.status === "OCCUPIED").length;
            const isFullyOccupied = property.units.length > 0 && occupiedUnits === property.units.length;
            return (
              <Link key={property.id} href={`/owner/properties/${property.id}`} className="block">
                <Card className="hover:border-slate-300">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="mt-0.5 text-sm text-foreground-muted">
                        {property.addressLine}, {property.city}
                      </p>
                      <p className="mt-2 text-sm text-foreground-muted">
                        {occupiedUnits}/{property.units.length} unit(s) occupied
                      </p>
                    </div>
                    <Badge tone={property.units.length === 0 ? "neutral" : isFullyOccupied ? "success" : "warning"}>
                      {property.units.length === 0 ? "No units" : isFullyOccupied ? "Fully occupied" : "Vacancy"}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

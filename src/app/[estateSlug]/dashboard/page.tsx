import { Role } from "@prisma/client";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

async function AdminOverview({ estateId }: { estateId: string }) {
  const [propertyCount, unitCount, residentCount, occupiedUnits] = await Promise.all([
    prisma.property.count({ where: { estateId } }),
    prisma.unit.count({ where: { estateId } }),
    prisma.resident.count({ where: { estateId } }),
    prisma.unit.count({ where: { estateId, occupancyStatus: "OCCUPIED" } }),
  ]);

  const stats = [
    { label: "Properties", value: propertyCount },
    { label: "Units", value: unitCount },
    { label: "Occupied units", value: occupiedUnits },
    { label: "Registered residents", value: residentCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <p className="text-2xl font-semibold">{s.value}</p>
          <p className="mt-1 text-sm text-slate-500">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Card>
  );
}

export default async function EstateDashboardPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Good day, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">{membership.estateName}</p>
      </div>

      {membership.role === Role.ESTATE_ADMIN && <AdminOverview estateId={membership.estateId} />}

      {membership.role === Role.FINANCE && (
        <PlaceholderPanel
          title="Finance dashboard"
          description="Collections, outstanding balances, and invoices arrive in Phase 2 once billing is built."
        />
      )}

      {membership.role === Role.FACILITY_MANAGER && (
        <PlaceholderPanel
          title="Facility dashboard"
          description="Maintenance tickets, utilities, and vendor work orders arrive in Phase 3."
        />
      )}

      {membership.role === Role.SECURITY && (
        <PlaceholderPanel
          title="Gate Mode"
          description="Visitor QR/PIN verification and check-in/out arrive in Phase 3. Security has no access to billing data by design."
        />
      )}

      {membership.role === Role.RESIDENT && (
        <PlaceholderPanel
          title="Your estate"
          description="Bills, payments, visitor invitations, and maintenance requests arrive in later phases. For now this confirms your resident login and estate access work end to end."
        />
      )}

      {membership.role === Role.VENDOR && (
        <PlaceholderPanel title="My jobs" description="Assigned work orders arrive in Phase 3." />
      )}
    </div>
  );
}

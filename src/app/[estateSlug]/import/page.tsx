import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";

export default async function ImportIndexPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Import data</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bring in your existing records from a spreadsheet. Import properties first, then residents.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/${estateSlug}/import/properties`}>
          <Card className="transition-shadow hover:shadow-md">
            <p className="font-medium">Import properties</p>
            <p className="mt-1 text-sm text-slate-500">Addresses, property types, blocks, streets, and units.</p>
          </Card>
        </Link>
        <Link href={`/${estateSlug}/import/residents`}>
          <Card className="transition-shadow hover:shadow-md">
            <p className="font-medium">Import residents</p>
            <p className="mt-1 text-sm text-slate-500">
              Residents, their unit, occupancy role, and an optional vehicle — properties must already exist.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

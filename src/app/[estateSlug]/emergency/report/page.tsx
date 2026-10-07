import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { ReportConcernForm } from "./ReportConcernForm";

export default async function ReportConcernPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "own-incidents:create"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Report a concern</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          For non-urgent concerns. If it&apos;s an emergency, call the estate office from the{" "}
          <Link href={`/${estateSlug}/emergency`} className="font-medium text-danger underline">
            Emergency page
          </Link>{" "}
          instead — don&apos;t wait for a reply here.
        </p>
      </div>
      <Card>
        <ReportConcernForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireExecutiveEstateAccess } from "@/server/modules/owner/access";
import { getCommandCenterOverview } from "@/server/modules/estates/commandCenter";
import { getEstateLocale } from "@/server/modules/estates/service";
import { formatMoney, formatDate } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";

const URGENCY_BADGE_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export default async function OwnerEstateHomePage({ params }: { params: Promise<{ estateId: string }> }) {
  const { estateId } = await params;
  const user = await guardPage(() => requireUser());

  let estate: Awaited<ReturnType<typeof requireExecutiveEstateAccess>>;
  try {
    estate = await requireExecutiveEstateAccess(user.id, estateId);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [overview, locale] = await Promise.all([getCommandCenterOverview(estateId), getEstateLocale(estateId)]);
  const money = (kobo: number) => formatMoney(kobo, locale.currency, locale.locale);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">{estate.name} — here&apos;s what needs your attention today.</p>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-foreground-muted">Service charges collected</p>
            <p className="mt-1 text-xl font-semibold text-success">
              {overview.finance.collectionRate !== null ? `${overview.finance.collectionRate}%` : "—"}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-warning">{money(overview.finance.outstandingKobo)}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Open maintenance</p>
            <p className="mt-1 text-xl font-semibold">{overview.today.openMaintenance}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Security incidents</p>
            <p className="mt-1 text-xl font-semibold">{overview.security.openIncidents}</p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Needs your attention</h2>
        {overview.attention.length === 0 ? (
          <Card className="text-center">
            <p className="font-medium">Nothing needs your attention</p>
            <p className="mt-1 text-sm text-foreground-muted">The estate is running smoothly.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {overview.attention.map((item) => (
              <Link key={item.id} href={`/${estate.slug}/${item.href}`} className="block">
                <Card className="hover:border-slate-300">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-0.5 text-sm text-foreground-muted">{item.detail}</p>
                    </div>
                    <Badge tone={URGENCY_BADGE_TONE[item.urgency]}>{item.ctaLabel}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Financial snapshot · This month</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-foreground-muted">Collected</p>
            <p className="mt-1 text-lg font-semibold text-success">{money(overview.finance.collectionsThisMonthKobo)}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Outstanding</p>
            <p className="mt-1 text-lg font-semibold text-warning">{money(overview.finance.outstandingKobo)}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Overdue invoices</p>
            <p className="mt-1 text-lg font-semibold">{overview.finance.overdueCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Occupancy</p>
            <p className="mt-1 text-lg font-semibold">
              {overview.residents.occupiedUnits}/{overview.residents.unitCount}
            </p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Operations today</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-foreground-muted">Expected visitors</p>
            <p className="mt-1 text-lg font-semibold">{overview.today.expectedVisitors}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Currently inside</p>
            <p className="mt-1 text-lg font-semibold">{overview.today.currentlyInside}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Residents</p>
            <p className="mt-1 text-lg font-semibold">{overview.residents.residentCount}</p>
          </Card>
        </div>
      </section>

      {overview.recentAnnouncements.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Recent activity</h2>
          <div className="space-y-2">
            {overview.recentAnnouncements.map((a) => (
              <Card key={a.id}>
                <p className="font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">{formatDate(a.createdAt)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-foreground-muted">
        Detailed accounting and operations stay in{" "}
        <Link href={`/${estate.slug}/dashboard`} className="text-primary hover:underline">
          Estate Management
        </Link>
        .
      </p>
    </div>
  );
}

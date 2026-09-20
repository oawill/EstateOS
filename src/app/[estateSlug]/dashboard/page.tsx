import Link from "next/link";
import { Role } from "@prisma/client";
import { Badge, Button, Card } from "@/components/shared/ui";
import { KpiCard, type KpiTone } from "@/components/shared/KpiCard";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { formatMoney } from "@/lib/utils";
import { getFinanceSummary, getResidentOutstandingBalanceKobo, listInvoicesForResident } from "@/server/modules/billing/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { countCurrentlyCheckedIn, listPassesForResident, passStatus } from "@/server/modules/visitors/service";
import { getMaintenanceSummary, listTicketsForResident } from "@/server/modules/maintenance/service";
import { countUnreadNotifications, listAnnouncements } from "@/server/modules/announcements/service";

interface EstateLocale {
  currency: string;
  locale: string;
  timezone: string;
}

async function AdminOverview({ estateId, estateLocale }: { estateId: string; estateLocale: EstateLocale }) {
  const [propertyCount, unitCount, residentCount, occupiedUnits, financeSummary, checkedInCount, maintenanceSummary] =
    await Promise.all([
      prisma.property.count({ where: { estateId } }),
      prisma.unit.count({ where: { estateId } }),
      prisma.resident.count({ where: { estateId } }),
      prisma.unit.count({ where: { estateId, occupancyStatus: "OCCUPIED" } }),
      getFinanceSummary(estateId),
      countCurrentlyCheckedIn(estateId),
      getMaintenanceSummary(estateId),
    ]);
  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);

  const stats: { label: string; value: string | number; tone?: KpiTone }[] = [
    { label: "Properties", value: propertyCount },
    { label: "Units", value: unitCount },
    { label: "Occupied units", value: occupiedUnits },
    { label: "Registered residents", value: residentCount, tone: "gray" },
    { label: "Collected this month", value: money(financeSummary.collectionsThisMonthKobo), tone: "success" },
    { label: "Outstanding", value: money(financeSummary.outstandingKobo), tone: "warning" },
    { label: "Overdue invoices", value: financeSummary.overdueCount, tone: "danger" },
    { label: "Visitors currently inside", value: checkedInCount, tone: "gray" },
    { label: "Open maintenance tickets", value: maintenanceSummary.openCount, tone: "warning" },
    { label: "Overdue maintenance tickets", value: maintenanceSummary.overdueCount, tone: "danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <KpiCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
      ))}
    </div>
  );
}

async function FinanceOverview({ estateId, estateLocale }: { estateId: string; estateLocale: EstateLocale }) {
  const summary = await getFinanceSummary(estateId);
  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);
  const stats: { label: string; value: string | number; tone: KpiTone }[] = [
    { label: "Collected today", value: money(summary.collectionsTodayKobo), tone: "success" },
    { label: "Collected this month", value: money(summary.collectionsThisMonthKobo), tone: "success" },
    { label: "Collected this year", value: money(summary.collectionsThisYearKobo), tone: "success" },
    { label: "Outstanding", value: money(summary.outstandingKobo), tone: "warning" },
    { label: "Overdue invoices", value: summary.overdueCount, tone: "danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((s) => (
        <KpiCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
      ))}
    </div>
  );
}

async function FacilityOverview({ estateId, estateSlug }: { estateId: string; estateSlug: string }) {
  const summary = await getMaintenanceSummary(estateId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard tone="warning" label="Open tickets" value={summary.openCount} />
        <KpiCard tone="danger" label="Overdue tickets" value={summary.overdueCount} />
      </div>
      <Link href={`/${estateSlug}/facility`}>
        <Button className="w-full">Open Facility</Button>
      </Link>
    </div>
  );
}

const QUICK_ACTION_ICONS: Record<string, React.ReactNode> = {
  visitor: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  pay: <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />,
  issue: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  emergency: <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />,
};

function QuickAction({ href, label, icon, danger }: { href: string; label: string; icon: string; danger?: boolean }) {
  return (
    <Link href={href}>
      <div
        className={`flex h-full flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center shadow-sm transition-shadow hover:shadow-md ${
          danger ? "border-danger/30 bg-danger/5" : "border-border bg-surface"
        }`}
      >
        <svg viewBox="0 0 24 24" className={`h-6 w-6 ${danger ? "text-danger" : "text-primary"}`} fill="none" stroke="currentColor" strokeWidth="1.8">
          {QUICK_ACTION_ICONS[icon]}
        </svg>
        <p className={`text-sm font-medium ${danger ? "text-danger" : ""}`}>{label}</p>
      </div>
    </Link>
  );
}

function HomeStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2.5">
      <p className="text-[11px] text-foreground-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

async function ResidentOverview({
  estateId,
  estateSlug,
  userId,
  estateLocale,
}: {
  estateId: string;
  estateSlug: string;
  userId: string;
  estateLocale: EstateLocale;
}) {
  const resident = await getResidentByUserId(estateId, userId);
  if (!resident) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Your resident profile isn&apos;t linked yet — contact your estate administrator.</p>
      </Card>
    );
  }

  const [outstandingKobo, unreadCount, occupancy, passes, tickets, announcements, invoices] = await Promise.all([
    getResidentOutstandingBalanceKobo(estateId, resident.id),
    countUnreadNotifications(estateId, resident.id),
    prisma.occupancy.findFirst({
      where: { residentId: resident.id, isCurrent: true },
      include: { unit: { include: { property: true } } },
    }),
    listPassesForResident(estateId, resident.id),
    listTicketsForResident(estateId, resident.id),
    listAnnouncements(estateId),
    listInvoicesForResident(estateId, resident.id),
  ]);

  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);
  const upcomingOrActivePasses = passes.filter((p) => {
    const status = passStatus(p);
    return status === "VALID" || status === "NOT_YET_STARTED";
  });
  const openTickets = tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED");

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const visitorsTodayCount = passes.filter((p) => p.startTime >= todayStart && p.startTime < todayEnd && !p.isRevoked).length;

  const nextInvoice = invoices
    .filter((i) => i.status === "PENDING" || i.status === "PARTIALLY_PAID")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  const allGood = outstandingKobo === 0 && openTickets.length === 0;
  const dateFormatter = new Intl.DateTimeFormat(estateLocale.locale, { month: "short", day: "numeric", timeZone: estateLocale.timezone });

  return (
    <div className="space-y-6">
      {/* Your Home */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Your Home</p>
            {occupancy ? (
              <p className="mt-1 text-lg font-semibold">
                {occupancy.unit.property.addressLabel}
                {occupancy.unit.label ? ` · Unit ${occupancy.unit.label}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold">No unit on file</p>
            )}
          </div>
          <Badge tone={allGood ? "success" : "warning"}>{allGood ? "All Good" : "Needs Attention"}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HomeStat label="Service Charges" value={outstandingKobo > 0 ? money(outstandingKobo) : "Paid ✓"} tone={outstandingKobo > 0 ? "warning" : "success"} />
          <HomeStat label="Open Maintenance" value={String(openTickets.length)} tone={openTickets.length > 0 ? "warning" : undefined} />
          <HomeStat label="Visitors Today" value={String(visitorsTodayCount)} />
          <HomeStat label="Next Payment" value={nextInvoice ? dateFormatter.format(nextInvoice.dueDate) : "None due"} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href={`/${estateSlug}/visitors/new`} label="Invite Visitor" icon="visitor" />
        <QuickAction href={`/${estateSlug}/my/bills`} label="Pay Bill" icon="pay" />
        <QuickAction href={`/${estateSlug}/maintenance/new`} label="Report Issue" icon="issue" />
        <QuickAction href={`/${estateSlug}/emergency`} label="Emergency" icon="emergency" danger />
      </div>

      {/* Visitors & Gate Passes */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Visitors &amp; Gate Passes</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {upcomingOrActivePasses.length > 0
              ? `${upcomingOrActivePasses.length} upcoming or active pass${upcomingOrActivePasses.length === 1 ? "" : "es"}`
              : "No upcoming visitors"}
          </p>
        </div>
        <Link href={`/${estateSlug}/visitors`}>
          <Button variant="secondary">{upcomingOrActivePasses.length > 0 ? "View" : "Invite"}</Button>
        </Link>
      </Card>

      {/* Estate Updates */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Estate Updates</p>
          <Link href={`/${estateSlug}/announcements`} className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {announcements.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No estate updates yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {announcements.slice(0, 2).map((a) => (
              <Card key={a.id} className={a.category === "SECURITY_NOTICE" ? "border-warning/30 bg-warning/5" : undefined}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <Badge tone={a.category === "SECURITY_NOTICE" ? "warning" : "neutral"}>{a.category.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">{a.body}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Link href={`/${estateSlug}/notifications`}>
        <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
          <p className="text-sm text-foreground-muted">Notifications</p>
          {unreadCount > 0 ? <Badge tone="info">{unreadCount} new</Badge> : <Badge>Up to date</Badge>}
        </Card>
      </Link>
    </div>
  );
}

export default async function EstateDashboardPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));
  const estateLocale = await getEstateLocale(membership.estateId);
  const isResidentRole = membership.role === Role.RESIDENT;
  const hour = new Date().getHours();
  const timeOfDayGreeting = isResidentRole ? (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening") : "Good day";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {timeOfDayGreeting}, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-foreground-muted">{membership.estateName}</p>
      </div>

      {membership.role === Role.ESTATE_ADMIN && (
        <AdminOverview estateId={membership.estateId} estateLocale={estateLocale} />
      )}

      {membership.role === Role.FINANCE && (
        <FinanceOverview estateId={membership.estateId} estateLocale={estateLocale} />
      )}

      {membership.role === Role.FACILITY_MANAGER && (
        <FacilityOverview estateId={membership.estateId} estateSlug={estateSlug} />
      )}

      {membership.role === Role.SECURITY && (
        <Card>
          <h2 className="font-medium">Gate Mode</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify visitor QR codes and PINs, and check visitors in/out. Security has no access to billing or
            resident financial data by design.
          </p>
          <Link href={`/${estateSlug}/gate`}>
            <Button className="mt-4 w-full">Open Gate Mode</Button>
          </Link>
        </Card>
      )}

      {membership.role === Role.RESIDENT && (
        <ResidentOverview
          estateId={membership.estateId}
          estateSlug={estateSlug}
          userId={user.id}
          estateLocale={estateLocale}
        />
      )}

      {membership.role === Role.VENDOR && (
        <Card>
          <h2 className="font-medium">My jobs</h2>
          <p className="mt-1 text-sm text-slate-500">Maintenance tickets assigned to you.</p>
          <Link href={`/${estateSlug}/jobs`}>
            <Button className="mt-4 w-full">View my jobs</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

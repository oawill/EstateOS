"use client";

import { useState } from "react";
import { KpiCard, type KpiTone } from "@/components/shared/KpiCard";
import { Button } from "@/components/shared/ui";

interface RoleContent {
  id: string;
  label: string;
  headerTitle: string;
  kpis: { label: string; value: string; tone: KpiTone }[];
  listLabel: string;
  listItems: string[];
  phoneHeading: string;
  phoneStat: { label: string; value: string };
  showPayNow?: boolean;
  quickActions: string[];
}

// Illustrative marketing mock data only — this preview requires no
// authentication and fetches nothing; it never touches live application
// data. Values are realistic Nigerian-estate figures for demonstration.
const ROLES: RoleContent[] = [
  {
    id: "manager",
    label: "Estate Manager",
    headerTitle: "NidraQ — Estate Manager",
    kpis: [
      { label: "Total Collected", value: "₦48.6M", tone: "success" },
      { label: "Outstanding", value: "₦7.2M", tone: "warning" },
      { label: "Collection Rate", value: "87%", tone: "neutral" },
      { label: "Residents", value: "1,243", tone: "gray" },
      { label: "Open Maintenance", value: "6", tone: "warning" },
      { label: "Visitors Today", value: "18", tone: "gray" },
    ],
    listLabel: "Recent activity",
    listItems: [
      "Payment received — Block A, Unit 12",
      "Visitor check-in — Block C gate",
      "Maintenance request — Street 4 lighting",
    ],
    phoneHeading: "Today's Summary",
    phoneStat: { label: "Collection Rate", value: "87%" },
    quickActions: ["Visitors", "Maintenance", "Community", "Bills"],
  },
  {
    id: "resident",
    label: "Resident",
    headerTitle: "NidraQ — Resident",
    kpis: [
      { label: "Balance Due", value: "₦125,000", tone: "danger" },
      { label: "Utility Balance", value: "₦18,400", tone: "gray" },
    ],
    listLabel: "Payment history",
    listItems: ["Service charge — Paid, 2 Aug", "Electricity — Paid, 15 Jul", "Diesel levy — Pending"],
    phoneHeading: "Good morning, Adebayo",
    phoneStat: { label: "Wallet Balance", value: "₦125,000" },
    showPayNow: true,
    quickActions: ["Pay Bill", "Invite Visitor", "Report Issue", "View Statement"],
  },
  {
    id: "security",
    label: "Security",
    headerTitle: "NidraQ — Security",
    kpis: [
      { label: "Visitors Expected", value: "24", tone: "gray" },
      { label: "Visitors Inside", value: "9", tone: "neutral" },
      { label: "Pending Approvals", value: "3", tone: "warning" },
      { label: "Vehicles Entering", value: "12", tone: "gray" },
    ],
    listLabel: "Recent gate activity",
    listItems: ["Visitor checked in — Unit 14B", "Vehicle logged — Block C gate", "Contractor access — Plumbing, Unit 22"],
    phoneHeading: "Gate — Main Entrance",
    phoneStat: { label: "Visitors Inside", value: "9" },
    quickActions: ["Verify Visitor", "Search Resident", "Log Incident", "Check Vehicle"],
  },
  {
    id: "finance",
    label: "Finance",
    headerTitle: "NidraQ — Finance",
    kpis: [
      { label: "Collected", value: "₦48.6M", tone: "success" },
      { label: "Outstanding", value: "₦7.2M", tone: "warning" },
      { label: "Collection Rate", value: "87%", tone: "neutral" },
      { label: "Arrears", value: "₦3.1M", tone: "danger" },
    ],
    listLabel: "Recent payments",
    listItems: ["₦125,000 — Unit 12B, Paystack", "₦95,000 — Unit 4A, Bank transfer", "₦210,000 — Unit 9C, Paystack"],
    phoneHeading: "This Month",
    phoneStat: { label: "Reconciled", value: "96%" },
    quickActions: ["View Transactions", "Reconcile Payments", "Export Report", "Send Reminder"],
  },
];

/** Abstract skyline silhouette — no real photography exists in this repo, so the "property" backdrop is a hand-authored SVG in the same geometric language as the logo mark, not a photo. Purely decorative. */
function SkylineBackdrop() {
  return (
    <svg
      viewBox="0 0 500 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
    >
      {[
        [0, 90, 60, 130],
        [65, 40, 110, 180],
        [120, 70, 165, 150],
        [175, 20, 230, 200],
        [240, 60, 285, 160],
        [295, 100, 340, 120],
        [350, 30, 405, 190],
        [415, 75, 460, 145],
        [470, 55, 500, 165],
      ].map(([x1, y1, x2], i) => (
        <rect key={i} x={x1} y={y1} width={x2 - x1} height={220 - y1} fill="white" />
      ))}
    </svg>
  );
}

function TrendSparkline() {
  return (
    <svg viewBox="0 0 200 50" className="h-12 w-full" aria-hidden="true">
      <polyline
        points="0,38 25,30 50,34 75,18 100,24 125,12 150,20 175,8 200,14"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProductPreview() {
  const [activeId, setActiveId] = useState(ROLES[0].id);
  const activeIndex = ROLES.findIndex((r) => r.id === activeId);
  const role = ROLES[activeIndex];

  function selectByIndex(index: number) {
    const next = ROLES[(index + ROLES.length) % ROLES.length];
    setActiveId(next.id);
    document.getElementById(`role-tab-${next.id}`)?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectByIndex(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectByIndex(activeIndex - 1);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-lg lg:mx-0 lg:mt-0">
      {/* Role selector */}
      <div role="tablist" aria-label="Preview by role" className="flex gap-1.5 overflow-x-auto pb-1" onKeyDown={onKeyDown}>
        {ROLES.map((r) => {
          const selected = r.id === activeId;
          return (
            <button
              key={r.id}
              id={`role-tab-${r.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="role-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(r.id)}
              className={
                selected
                  ? "whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
                  : "whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
              }
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div id="role-tabpanel" role="tabpanel" aria-labelledby={`role-tab-${activeId}`} className="relative mt-4">
        <SkylineBackdrop />

        {/* Desktop dashboard mockup */}
        <div key={role.id} className="animate-fade-in relative rounded-xl border border-white/10 bg-navy p-2 shadow-2xl">
          <div className="overflow-hidden rounded-lg bg-surface">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
              <span className="text-xs font-semibold text-foreground">{role.headerTitle}</span>
              <div className="flex gap-1" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-border" />
                <span className="h-2 w-2 rounded-full bg-border" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-foreground-muted">Dashboard Overview</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {role.kpis.map((kpi) => (
                  <div key={kpi.label} className="scale-[0.92] origin-top-left">
                    <KpiCard label={kpi.label} value={kpi.value} tone={kpi.tone} />
                  </div>
                ))}
              </div>
              {role.id === "manager" && (
                <div className="mt-3 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium text-foreground-muted">Collections trend</p>
                  <TrendSparkline />
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground-muted">{role.listLabel}</p>
                {role.listItems.map((item) => (
                  <p key={item} className="truncate text-xs text-foreground-muted">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="mx-auto h-2 w-1/3 rounded-b-lg bg-navy-light" aria-hidden="true" />
        </div>

        {/* Mobile app mockup */}
        <div key={`${role.id}-phone`} className="animate-fade-in absolute -bottom-10 -right-4 w-40 rounded-[1.5rem] border border-white/10 bg-navy p-1.5 shadow-2xl sm:-right-8 sm:w-44">
          <div className="overflow-hidden rounded-[1.1rem] bg-surface">
            <div className="flex justify-center bg-navy py-1" aria-hidden="true">
              <span className="h-1 w-8 rounded-full bg-white/30" />
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-foreground">{role.phoneHeading}</p>
              <div className="mt-2 rounded-lg bg-navy p-2.5 text-white">
                <p className="text-[9px] text-white/60">{role.phoneStat.label}</p>
                <p className="text-sm font-semibold">{role.phoneStat.value}</p>
                {role.showPayNow && (
                  <Button type="button" className="mt-1.5 !w-full !py-1.5 !text-[10px]">
                    Pay Now
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[9px] font-medium text-foreground-muted">Quick Actions</p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {role.quickActions.map((action) => (
                  <div key={action} className="truncate rounded-md bg-surface-muted px-1.5 py-1.5 text-center text-[9px] font-medium text-foreground">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

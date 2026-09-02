import type { ReactNode } from "react";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
}

interface Journey {
  name: string;
  description: string;
  icon: ReactNode;
  steps: [Step, Step, Step];
}

// Every step here maps to real, shipped functionality — invoices/payments
// (billing module), visitor QR/PIN passes verified at the gate (visitors
// module), and maintenance ticket assignment/resolution (maintenance
// module) — not aspirational marketing.

// Hand-rolled inline SVGs, matching the stroke-based icon convention already
// used throughout the landing page (FeatureGrid, SecurityGateOperations,
// etc.) — no icon library exists in this project, so none is added here.
const ICONS = {
  wallet: (
    <path
      d="M3 7a2 2 0 012-2h11a2 2 0 012 2v1h1a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm14 5h2m-2 0a1 1 0 100 2 1 1 0 000-2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  shield: (
    <path
      d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  wrench: (
    <path
      d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  invoice: (
    <path
      d="M6 3h9l3 3v15H6V3zm3 6h6m-6 4h6m-6 4h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  card: (
    <path
      d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 4h18M7 15h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  receiptCheck: (
    <path
      d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zm2.5 8.5L10 13l4-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  userPlus: (
    <path
      d="M11 13a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6M19 8v6m3-3h-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  qrCode: (
    <path
      d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 2h2v2h-2v-2zm4 0h2v4h-4v-2h2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  door: (
    <path
      d="M6 3h9v18H6V3zm9 0l4 1v16l-4-1M13 12h.01"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  report: (
    <path
      d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  teamAssign: (
    <path
      d="M9 11a3 3 0 100-6 3 3 0 000 6zm-6 9c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M18 8l2 2 3-3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  checkmark: (
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  users: (
    <path
      d="M9 11a3 3 0 100-6 3 3 0 000 6zm6 1a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M15 14.5c2.9.3 5 2.6 5 5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  briefcase: (
    <path
      d="M4 8h16v11H4V8zm4 0V5h8v3M4 13h16"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
} as const;

function StepIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors duration-200 group-hover:bg-primary/14">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

const JOURNEYS: Journey[] = [
  {
    name: "Money",
    description: "Seamless billing and payments with automatic reconciliation.",
    icon: ICONS.wallet,
    steps: [
      { number: "01", title: "Bill", description: "The estate creates service charges and other bills.", icon: ICONS.invoice },
      { number: "02", title: "Pay", description: "Residents pay digitally through the available payment method.", icon: ICONS.card },
      { number: "03", title: "Reconcile", description: "Payments, receipts and outstanding balances update automatically.", icon: ICONS.receiptCheck },
    ],
  },
  {
    name: "Access",
    description: "Secure visitor access from invitation to entry and recording.",
    icon: ICONS.shield,
    steps: [
      { number: "04", title: "Invite", description: "A resident creates a visitor invitation.", icon: ICONS.userPlus },
      { number: "05", title: "Verify", description: "Security verifies the QR code or PIN at the gate.", icon: ICONS.qrCode },
      { number: "06", title: "Enter", description: "The visit is recorded in the access history.", icon: ICONS.door },
    ],
  },
  {
    name: "Maintenance",
    description: "Report issues and get them resolved faster.",
    icon: ICONS.wrench,
    steps: [
      { number: "07", title: "Report", description: "A resident reports an issue.", icon: ICONS.report },
      { number: "08", title: "Assign", description: "Management assigns the request to a team or vendor.", icon: ICONS.teamAssign },
      { number: "09", title: "Resolve", description: "The issue is completed and the resident is updated.", icon: ICONS.checkmark },
    ],
  },
];

const SYSTEM_STRIP = [
  { label: "Residents", icon: ICONS.users },
  { label: "Finance", icon: ICONS.wallet },
  { label: "Security", icon: ICONS.shield },
  { label: "Facilities", icon: ICONS.wrench },
  { label: "Management", icon: ICONS.briefcase },
] as const;

/** A short connector between two step cards — a thin line with a small chevron control, never a real button. */
function StepConnector({ direction }: { direction: "right" | "down" }) {
  return (
    <div
      aria-hidden="true"
      className={
        direction === "right"
          ? "relative hidden w-10 flex-none items-center justify-center md:flex"
          : "relative flex h-8 items-center justify-center md:hidden"
      }
    >
      <div
        className={
          direction === "right"
            ? "absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
            : "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border"
        }
      />
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-surface text-primary shadow-sm">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          {direction === "right" ? (
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div
      className="group relative flex-1 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md motion-safe:hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <StepIcon>{step.icon}</StepIcon>
        <span className="text-xs font-semibold tabular-nums text-primary">{step.number}</span>
      </div>
      <h4 className="mt-3 font-medium tracking-tight">{step.title}</h4>
      <p className="mt-1.5 text-sm text-foreground-muted">{step.description}</p>
      <span className="mt-4 block h-0.5 w-8 rounded-full bg-primary/70" aria-hidden="true" />
    </div>
  );
}

function JourneyLabelCard({ journey }: { journey: Journey }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-muted p-5 md:w-56 md:flex-none">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          {journey.icon}
        </svg>
      </span>
      <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide">{journey.name}</h3>
      <p className="mt-1.5 text-sm text-foreground-muted">{journey.description}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">The everyday flow</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How NidraQ Works</h2>
        <p className="mt-4 text-base leading-relaxed text-foreground-muted">
          From service charges to visitor access and maintenance, NidraQ connects the everyday workflows that keep
          your community running.
        </p>
      </div>

      <div className="mt-16 space-y-8">
        {JOURNEYS.map((journey) => (
          <div key={journey.name} className="flex flex-col gap-4 md:flex-row md:items-stretch">
            <JourneyLabelCard journey={journey} />
            <div className="flex flex-1 flex-col md:flex-row md:items-stretch">
              {journey.steps.map((step, i) => (
                <div key={step.number} className="contents md:flex md:flex-1 md:items-stretch">
                  <StepCard step={step} />
                  {i < journey.steps.length - 1 && (
                    <StepConnector direction="down" />
                  )}
                  {i < journey.steps.length - 1 && (
                    <StepConnector direction="right" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-muted px-6 py-10 text-center">
        <h3 className="text-xl font-semibold tracking-tight">One Community. One Operational System.</h3>
        <p className="mx-auto mt-2 max-w-xl text-foreground-muted">
          Residents, finance teams, security personnel, facility managers and administrators work from the same
          connected platform.
        </p>
        <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {SYSTEM_STRIP.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-foreground-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

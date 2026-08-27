interface Step {
  number: string;
  title: string;
  description: string;
}

interface Journey {
  name: string;
  steps: [Step, Step, Step];
}

// Every step here maps to real, shipped functionality — invoices/payments
// (billing module), visitor QR/PIN passes verified at the gate (visitors
// module), and maintenance ticket assignment/resolution (maintenance
// module) — not aspirational marketing.
const JOURNEYS: Journey[] = [
  {
    name: "Money",
    steps: [
      { number: "01", title: "Bill", description: "The estate creates service charges and other bills." },
      { number: "02", title: "Pay", description: "Residents pay digitally through the available payment method." },
      { number: "03", title: "Reconcile", description: "Payments, receipts and outstanding balances update automatically." },
    ],
  },
  {
    name: "Access",
    steps: [
      { number: "04", title: "Invite", description: "A resident creates a visitor invitation." },
      { number: "05", title: "Verify", description: "Security verifies the QR code or PIN at the gate." },
      { number: "06", title: "Enter", description: "The visit is recorded in the access history." },
    ],
  },
  {
    name: "Maintenance",
    steps: [
      { number: "07", title: "Report", description: "A resident reports an issue." },
      { number: "08", title: "Assign", description: "Management assigns the request to a team or vendor." },
      { number: "09", title: "Resolve", description: "The issue is completed and the resident is updated." },
    ],
  },
];

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="hidden h-5 w-5 flex-none text-border md:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-border md:hidden" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">The everyday flow</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">How EstateOS Works</h2>
        <p className="mt-4 text-foreground-muted">
          From service charges to visitor access and maintenance, EstateOS connects the everyday workflows that keep
          your community running.
        </p>
      </div>

      <div className="mt-14 space-y-12">
        {JOURNEYS.map((journey) => (
          <div key={journey.name}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">{journey.name}</h3>
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-3">
              {journey.steps.map((step, i) => (
                <div key={step.number} className="contents md:flex md:flex-1 md:items-center md:gap-3">
                  <div className="rounded-xl border border-border bg-surface p-5 md:flex-1">
                    <p className="text-xs font-semibold text-primary">{step.number}</p>
                    <p className="mt-1 font-medium">{step.title}</p>
                    <p className="mt-1.5 text-sm text-foreground-muted">{step.description}</p>
                  </div>
                  {i < journey.steps.length - 1 && (
                    <div className="flex items-center justify-center py-2 md:py-0">
                      <DownArrow />
                      <Arrow />
                    </div>
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
      </div>
    </section>
  );
}

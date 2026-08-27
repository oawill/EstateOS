const POINTS = [
  "Role-based access — every user sees only what their role allows",
  "Tenant isolation enforced at the database layer, not just the UI",
  "An audit log of administrative actions, with before/after detail",
  "Payment confirmation is always signature-verified server-side, never trusted from the frontend",
] as const;

export function SecuritySection() {
  return (
    <section id="trust" className="gradient-premium text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-20 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Your community.
            <br />
            Your data. Your control.
          </h2>
        </div>
        <ul className="space-y-4">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-slate-300">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

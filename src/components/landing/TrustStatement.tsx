// Reusable social-proof band. Until EstateOS has verified customer numbers,
// `stats` stays empty and this renders the positioning statement instead —
// swap in real figures later (e.g. { value: "25", label: "Communities" })
// without touching layout or the rest of the homepage.
interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [];

const CAPABILITIES = [
  "Secure platform architecture",
  "Role-based access",
  "Multi-community support",
  "Payment reconciliation",
  "Auditability",
] as const;

export function TrustStatement() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {STATS.length > 0 ? (
          <dl className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</dt>
                <dd className="mt-1 text-sm text-foreground-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium tracking-tight text-foreground sm:text-xl">
              Designed with modern community operations in mind
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {CAPABILITIES.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground-muted">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

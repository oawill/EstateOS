const CHANNELS = ["In-app", "Email", "WhatsApp-ready"] as const;

export function ConnectedCommunications() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground-muted">Connected communications</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Built for WhatsApp-ready communication.</h2>
          <p className="mt-4 max-w-lg text-foreground-muted">
            NidraQ is architected around a shared notification service — one system deciding what to send, to whom
            and through which channel — so bills, payment confirmations, visitor updates and maintenance status
            changes are ready to reach residents on WhatsApp as that channel comes online, alongside in-app and
            email. NidraQ always remains the system of record; WhatsApp is a delivery channel, not a database.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-foreground-muted">Notification channels</p>
          <ul className="mt-3 space-y-2.5">
            {CHANNELS.map((channel) => (
              <li key={channel} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {channel}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-foreground-muted">
            WhatsApp delivery activates once messaging credentials are configured for your community.
          </p>
        </div>
      </div>
    </section>
  );
}

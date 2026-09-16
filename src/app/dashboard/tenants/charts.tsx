// Hand-rolled inline SVG charts — matches the rest of the codebase's
// convention of no charting library. Kept intentionally simple (bars/arc)
// since these are dashboard-glance visuals, not analytical tooling.

export function RentCollectedVsExpectedChart({ expectedMinor, collectedMinor }: { expectedMinor: number; collectedMinor: number }) {
  const max = Math.max(expectedMinor, collectedMinor, 1);
  const expectedHeight = Math.round((expectedMinor / max) * 100);
  const collectedHeight = Math.round((collectedMinor / max) * 100);

  return (
    <svg viewBox="0 0 160 120" className="h-32 w-full" aria-hidden="true">
      <g>
        <rect x="30" y={110 - expectedHeight} width="36" height={expectedHeight} rx="4" className="fill-silver" />
        <rect x="94" y={110 - collectedHeight} width="36" height={collectedHeight} rx="4" className="fill-primary" />
      </g>
      <text x="48" y="118" textAnchor="middle" fontSize="9" className="fill-current text-foreground-muted">
        Expected
      </text>
      <text x="112" y="118" textAnchor="middle" fontSize="9" className="fill-current text-foreground-muted">
        Collected
      </text>
    </svg>
  );
}

export function OccupancyChart({ occupied, vacant }: { occupied: number; vacant: number }) {
  const total = occupied + vacant;
  const occupiedPct = total > 0 ? occupied / total : 0;
  const circumference = 2 * Math.PI * 40;
  const occupiedLength = circumference * occupiedPct;

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="14" className="stroke-surface-muted" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={`${occupiedLength} ${circumference - occupiedLength}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="600" className="fill-current text-foreground">
        {total > 0 ? Math.round(occupiedPct * 100) : 0}%
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="8" className="fill-current text-foreground-muted">
        occupied
      </text>
    </svg>
  );
}

export function LeaseExpirationsChart({ in30, in60, in90 }: { in30: number; in60: number; in90: number }) {
  const max = Math.max(in30, in60, in90, 1);
  const bars = [
    { label: "30d", value: in30 },
    { label: "60d", value: in60 },
    { label: "90d", value: in90 },
  ];

  return (
    <svg viewBox="0 0 160 120" className="h-32 w-full" aria-hidden="true">
      {bars.map((b, i) => {
        const height = Math.round((b.value / max) * 90);
        const x = 20 + i * 48;
        return (
          <g key={b.label}>
            <rect x={x} y={108 - height} width="28" height={height} rx="4" className="fill-warning" />
            <text x={x + 14} y="118" textAnchor="middle" fontSize="9" className="fill-current text-foreground-muted">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

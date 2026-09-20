const STEPS = [
  { key: "estate", label: "Estate" },
  { key: "structure", label: "Structure" },
  { key: "residents", label: "Residents" },
  { key: "financials", label: "Financials" },
  { key: "review", label: "Review" },
] as const;

export type OnboardingStepKey = (typeof STEPS)[number]["key"];

export function OnboardingStepper({ current }: { current: OnboardingStepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>Estate Setup</span>
        <span>
          {currentIndex + 1} of {STEPS.length}
        </span>
      </div>
      <ol className="flex items-center gap-1.5">
        {STEPS.map((step, i) => (
          <li key={step.key} className="flex flex-1 items-center gap-1.5">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                i < currentIndex
                  ? "bg-success text-white"
                  : i === currentIndex
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-foreground-muted"
              }`}
            >
              {i < currentIndex ? "✓" : i + 1}
            </div>
            <span className={`hidden text-xs sm:inline ${i === currentIndex ? "font-medium text-foreground" : "text-foreground-muted"}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

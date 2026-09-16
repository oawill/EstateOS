import type { ReactNode } from "react";
import Link from "next/link";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Shortlet Management's own small design-system layer — deliberately
 * separate from src/components/shared/ui.tsx's Card/Button/etc (which this
 * module still uses underneath for buttons/inputs/forms), giving the
 * module's hospitality-flavored surfaces (property cards, stat tiles, the
 * attention feed) a consistent, premium shape without forking the base
 * primitives everyone else relies on.
 */

export function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Good {timeOfDay}, {name}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>
    </div>
  );
}

export function HeroMetric({
  label,
  value,
  deltaPercent,
}: {
  label: string;
  value: string;
  deltaPercent?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{value}</p>
      {deltaPercent !== undefined && deltaPercent !== null && (
        <p className={cn("mt-2 text-sm font-medium", deltaPercent >= 0 ? "text-success" : "text-danger")}>
          {deltaPercent >= 0 ? "▲" : "▼"} {Math.abs(deltaPercent)}% vs last month
        </p>
      )}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function TodayCard({
  icon,
  count,
  label,
  href,
  emptyLabel,
}: {
  icon: ReactNode;
  count: number;
  label: string;
  href: string;
  emptyLabel: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">{count}</p>
        <p className="text-xs text-foreground-muted">{count === 0 ? emptyLabel : label}</p>
      </div>
    </Link>
  );
}

const URGENCY_STYLES: Record<"high" | "medium" | "low", string> = {
  high: "border-danger/30 bg-danger/5",
  medium: "border-warning/30 bg-warning/5",
  low: "border-border bg-surface",
};

export function AttentionItem({
  title,
  property,
  detail,
  ctaLabel,
  href,
  urgency = "medium",
}: {
  title: string;
  property: string;
  detail: string;
  ctaLabel: string;
  href: string;
  urgency?: "high" | "medium" | "low";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between",
        URGENCY_STYLES[urgency],
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-foreground-muted">
          {property} · {detail}
        </p>
      </div>
      <span className="whitespace-nowrap text-sm font-medium text-primary">{ctaLabel} →</span>
    </Link>
  );
}

export function EmptyState({ title, description, cta }: { title: string; description: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-foreground-muted">{description}</p>
      {cta}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  MAINTENANCE: "Maintenance",
  UNAVAILABLE: "Unavailable",
  INQUIRY: "Inquiry",
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Guest staying",
  CHECKED_OUT: "Checked out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-surface-muted text-foreground-muted",
  ACTIVE: "bg-success/10 text-success",
  INACTIVE: "bg-surface-muted text-foreground-muted",
  MAINTENANCE: "bg-warning/10 text-warning",
  UNAVAILABLE: "bg-danger/10 text-danger",
  INQUIRY: "bg-surface-muted text-foreground-muted",
  PENDING: "bg-warning/10 text-warning",
  AWAITING_PAYMENT: "bg-warning/10 text-warning",
  CONFIRMED: "bg-info/10 text-info",
  CHECKED_IN: "bg-success/10 text-success",
  CHECKED_OUT: "bg-surface-muted text-foreground-muted",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
  NO_SHOW: "bg-danger/10 text-danger",
};

/** Status is always shown as a labeled pill, never color alone — keeps booking/payment state legible without relying on color perception. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", STATUS_TONES[status] ?? "bg-surface-muted text-foreground-muted")}>
      {STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}

export function GuestAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary" aria-hidden>
      {initials || "?"}
    </div>
  );
}

export function PropertyImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-muted text-foreground-muted", className)} role="img" aria-label={alt}>
        <BuildingIcon />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}

export function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16M13 21v-9a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7h.01M7 11h.01M7 15h.01M17 13h.01M17 17h.01" strokeLinecap="round" />
    </svg>
  );
}

export function ArrivalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DepartureIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 15V3m0 12 4-4m-4 4-4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GuestsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M22 21c0-2.8-1.8-5-4.5-5.7" strokeLinecap="round" />
    </svg>
  );
}

const JOURNEY_STEPS = ["Booked", "Paid", "Pre-Arrival", "Checked In", "Checked Out", "Completed"] as const;

/** Maps a booking's actual status onto how far along the journey it's gotten — CANCELLED/NO_SHOW render as a distinct terminal state rather than forcing them onto this line. */
export function BookingJourney({ status, isPaid }: { status: string; isPaid: boolean }) {
  if (status === "CANCELLED" || status === "NO_SHOW") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
        {status === "CANCELLED" ? "Booking cancelled" : "Guest did not show"}
      </div>
    );
  }

  const currentIndex = (() => {
    if (status === "COMPLETED") return 5;
    if (status === "CHECKED_OUT") return 4;
    if (status === "CHECKED_IN") return 3;
    if (status === "CONFIRMED") return isPaid ? 2 : 1;
    return 0;
  })();

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Booking journey">
      {JOURNEY_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step} className="flex items-center">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                done ? "bg-primary text-white" : "bg-surface-muted text-foreground-muted",
              )}
              aria-current={i === currentIndex ? "step" : undefined}
            >
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {step}
            </span>
            {i < JOURNEY_STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function TurnoverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15a8 8 0 0 0 14.5 3.5M19.5 9A8 8 0 0 0 5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

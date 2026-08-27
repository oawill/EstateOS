export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatNaira(amountKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

// Generic minor-unit currency formatter for EstateOS Shortlet, which is
// architected for multiple currencies (see ShortletSettings.defaultCurrency)
// rather than hardcoded to Naira like the residential billing helper above.
export function formatCurrency(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

// Due dates are calendar dates with no meaningful time-of-day — format in
// UTC so "2026-09-01" always reads as 1 Sep regardless of server timezone.
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

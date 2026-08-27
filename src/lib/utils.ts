export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The single money formatter for the whole app — every amount is stored in
// minor units (kobo/cents/pesewas) and formatted through Intl.NumberFormat
// rather than manually concatenating a currency symbol, so a new currency
// is "pass a different code," not "add a new string-concatenation branch."
export function formatMoney(amountMinor: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

// Thin, backward-compatible wrapper — Nigeria/Naira remains the default
// for every call site that hasn't been made estate-currency-aware yet.
// Prefer formatMoney(amountKobo, estate.currency, estate.locale) directly
// wherever the estate's locale is already in scope.
export function formatNaira(amountKobo: number): string {
  return formatMoney(amountKobo, "NGN", "en-NG");
}

// Generic minor-unit currency formatter for NidraQ Shortlet, which is
// architected for multiple currencies (see ShortletSettings.defaultCurrency)
// rather than hardcoded to Naira like the residential billing helper above.
export function formatCurrency(amountMinor: number, currency: string, locale = "en-US"): string {
  return formatMoney(amountMinor, currency, locale);
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

// For timestamps where the time-of-day genuinely matters (visitor pass
// validity, gate entries, Shortlet check-in/out) — the server always runs
// in UTC, so "what time does this say" must be computed in the estate's
// (or Shortlet property's) configured IANA timezone, never assumed to
// match the server's own clock.
export function formatDateTime(date: Date | string, timezone: string, locale = "en-NG"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(date));
}

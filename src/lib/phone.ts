// Best-effort E.164-style normalization for newly-entered phone numbers.
// This never touches existing stored numbers — it's applied only where a
// form collects a fresh number, so Nigerian numbers already in the
// database are completely unaffected. Not a full phone-validation library;
// just enough to stop new international numbers from being silently
// mis-stored as if they were Nigerian.
export function normalizePhone(rawNumber: string, defaultCountryCode = "+234"): string {
  const trimmed = rawNumber.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  // A locally-dialed number starting with a trunk "0" — replace it with
  // the country code rather than concatenating (e.g. "0801..." + "+234"
  // should become "+234801...", not "+2340801...").
  if (digits.startsWith("0")) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return `${defaultCountryCode}${digits}`;
}

// Shared option lists for organization locale configuration. Nigeria stays
// first/default (the only market EstateOS operates in today), but these are
// real, selectable options — not a Nigeria-only enum — so a new estate can
// pick a different country from creation and existing estates can migrate
// later without a schema change.
export const COUNTRY_OPTIONS = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "USD", label: "USD — US Dollar" },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Accra", label: "Africa/Accra (GMT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
] as const;

// Nigeria is the only market with a live payment integration today —
// this mapping is deliberately not extended with speculative provider
// assignments for markets no integration decision has been made for yet.
export const COUNTRY_PAYMENT_PROVIDER: Record<string, string | null> = {
  NG: "Paystack",
  GH: null,
  KE: null,
  GB: null,
  US: null,
};

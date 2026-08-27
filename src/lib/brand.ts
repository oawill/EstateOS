// Centralized brand identity — the single source of truth for the product
// name, domain, and marketing copy, so a future rebrand (or just staying
// consistent) doesn't mean hunting through dozens of components. Always
// display BRAND.name exactly as "NidraQ" in customer-facing content —
// never "Nidraq", "NIDRAQ", or a suffixed variant like "NidraQ OS".
export const BRAND = {
  name: "NidraQ",
  domain: "nidraq.com",
  url: "https://nidraq.com",
  tagline: "Everything your community needs to run better.",
  shortTagline: "Every community. One platform.",
  description:
    "NidraQ brings residents, payments, access, maintenance, utilities and community operations together in one connected platform.",
} as const;

// Product architecture naming — used in marketing/positioning copy only.
// These are brand names for capability areas, not new routes or modules:
// the underlying features (visitors/gate, billing, community feed,
// Shortlet) are unchanged and unmoved.
export const PRODUCTS = {
  communities: "NidraQ Communities",
  access: "NidraQ Access",
  pay: "NidraQ Pay",
  community: "NidraQ Community",
  shortlet: "NidraQ Shortlet",
  managed: "NidraQ Managed",
} as const;

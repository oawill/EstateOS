// Trimmed to the 9 options in the simplified Request Demo form's Step 2 —
// the underlying OrganizationType enum keeps its older values (CONDOMINIUM,
// APARTMENT_COMPLEX, FACILITY_MANAGEMENT_COMPANY, PROPERTY_DEVELOPER,
// MIXED_RESIDENTIAL_COMMUNITY) for any already-stored rows, they're just not
// offered as choices going forward.
export const ORGANIZATION_TYPE_OPTIONS: [string, string][] = [
  ["RESIDENTIAL_ESTATE", "Residential Estate"],
  ["GATED_COMMUNITY", "Gated Community"],
  ["PROPERTY_MANAGEMENT_COMPANY", "Property Management Company"],
  ["APARTMENT_COMPLEX", "Apartment Building"],
  ["MIXED_USE_DEVELOPMENT", "Mixed-Use Development"],
  ["SERVICED_APARTMENT", "Serviced Apartment"],
  ["SHORTLET_OPERATOR", "Shortlet Operator"],
  ["HOA_COMMUNITY_ASSOCIATION", "HOA / Community Association"],
  ["OTHER", "Other"],
];

export const UNIT_RANGE_OPTIONS: [string, string][] = [
  ["RANGE_1_20", "1–20"],
  ["RANGE_21_50", "21–50"],
  ["RANGE_51_100", "51–100"],
  ["RANGE_101_250", "101–250"],
  ["RANGE_251_500", "251–500"],
  ["RANGE_501_1000", "501–1,000"],
  ["RANGE_1000_PLUS", "1,000+"],
];

export const PREFERRED_CONTACT_METHOD_OPTIONS: [string, string][] = [
  ["EMAIL", "Email"],
  ["PHONE", "Phone"],
  ["WHATSAPP", "WhatsApp"],
];

export const MANAGEMENT_METHOD_OPTIONS: [string, string][] = [
  ["WHATSAPP", "WhatsApp"],
  ["SPREADSHEETS", "Excel / Google Sheets"],
  ["PAPER_RECORDS", "Paper / manual records"],
  ["BANK_RECONCILIATION", "Bank-transfer reconciliation"],
  ["EXISTING_SOFTWARE", "Existing property-management software"],
  ["ACCOUNTING_SOFTWARE", "Accounting software"],
  ["OTHER", "Other"],
];

export const CHALLENGE_AREA_OPTIONS: [string, string][] = [
  ["SERVICE_CHARGES_COLLECTIONS", "Service charges and collections"],
  ["PAYMENT_RECONCILIATION", "Payment reconciliation"],
  ["RESIDENT_MANAGEMENT", "Resident management"],
  ["VISITOR_MANAGEMENT", "Visitor management"],
  ["GATE_SECURITY", "Gate/security operations"],
  ["MAINTENANCE_COMPLAINTS", "Maintenance and complaints"],
  ["ELECTRICITY_UTILITIES", "Electricity/utilities"],
  ["WATER", "Water"],
  ["DIESEL_GENERATOR", "Diesel/generator management"],
  ["VENDOR_MANAGEMENT", "Vendor management"],
  ["ANNOUNCEMENTS_COMMUNICATION", "Announcements and communication"],
  ["SHORTLET_BOOKINGS", "Shortlet bookings"],
  ["GUEST_CHECKIN_CHECKOUT", "Guest check-in/check-out"],
  ["HOUSEKEEPING", "Housekeeping"],
  ["REPORTING", "Reporting"],
  ["OTHER", "Other"],
];

// Same vocabulary as CHALLENGE_AREA_OPTIONS above, used for the simplified
// form's single "biggest operational challenge" question (Step 2).
export const PRIMARY_CHALLENGE_OPTIONS = CHALLENGE_AREA_OPTIONS;

export const FEATURE_INTEREST_OPTIONS: [string, string][] = [
  ["BILLING_PAYMENTS", "Billing & Payments"],
  ["RESIDENTS_UNITS", "Residents & Units"],
  ["SECURITY_GATE_MODE", "Security & Gate Operations"],
  ["VISITOR_QR_PIN", "Visitor Management"],
  ["MAINTENANCE", "Maintenance"],
  ["UTILITIES", "Utilities"],
  ["ANNOUNCEMENTS", "Community Communication"],
  ["VENDORS", "Vendor Management"],
  ["REPORTING_ANALYTICS", "Reporting"],
  ["SHORTLET_MANAGEMENT", "Shortlet Management"],
  ["WHATSAPP_NOTIFICATIONS", "WhatsApp Notifications"],
  ["DATA_MIGRATION", "Data Migration"],
  ["MULTI_PROPERTY_MANAGEMENT", "Multi-property Management"],
];

import type { ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  description?: string;
  icon?: ReactNode;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

// Every href below points at a route or anchor that already exists in the
// app — per the nav-restructure brief, nothing here should invent a page.
// Where a listed feature has no dedicated page yet, it links to the
// existing marketing page/section that already describes it.
const ICONS = {
  overview: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  estate: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01M9 7h.01M15 7h.01" strokeLinecap="round" strokeLinejoin="round" />,
  resident: <path d="M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />,
  tenant: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-8h6v8" strokeLinecap="round" strokeLinejoin="round" />,
  shortlet: <path d="M3 12l2-8h14l2 8M5 12h14v8H5v-8z" strokeLinecap="round" strokeLinejoin="round" />,
  payments: <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />,
  maintenance: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  security: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  visitor: <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />,
  community: <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />,
} as const;

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {path}
    </svg>
  );
}

export const PRODUCT_GROUPS: NavGroup[] = [
  {
    heading: "Platform",
    items: [
      { label: "Platform Overview", href: "/", description: "See how NidraQ connects your whole community.", icon: <Icon path={ICONS.overview} /> },
      { label: "Estate Management", href: "/estate-management", description: "Run the whole estate from one command center.", icon: <Icon path={ICONS.estate} /> },
      { label: "Resident App", href: "/resident-app", description: "Give residents passes, payments and requests in one app.", icon: <Icon path={ICONS.resident} /> },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Tenant Management", href: "/tenant-management", description: "Manage tenants, leases, payments and property activity.", icon: <Icon path={ICONS.tenant} /> },
      { label: "Shortlet Management", href: "/shortlet-management", description: "Manage short-stay properties, bookings, guests and operations.", icon: <Icon path={ICONS.shortlet} /> },
      { label: "Payments & Service Charges", href: "/estate-management#features", description: "Bill, collect and reconcile with a real financial ledger.", icon: <Icon path={ICONS.payments} /> },
      { label: "Maintenance & Complaints", href: "/estate-management#features", description: "Track work orders from request to resolution.", icon: <Icon path={ICONS.maintenance} /> },
    ],
  },
  {
    heading: "Access & Community",
    items: [
      { label: "Security & Gate Access", href: "/#security-gate", description: "Digital gate passes, QR scanning and access logs.", icon: <Icon path={ICONS.security} /> },
      { label: "Visitor Management", href: "/#security-gate", description: "Visitor passes, approvals and a live gate activity feed.", icon: <Icon path={ICONS.visitor} /> },
      { label: "Communications & Announcements", href: "/estate-management#features", description: "Keep residents informed with estate-wide updates.", icon: <Icon path={ICONS.community} /> },
    ],
  },
];

export const SOLUTIONS_GROUPS: NavGroup[] = [
  {
    heading: "By Community",
    items: [
      { label: "Residential Estates", href: "/estate-management" },
      { label: "Gated Communities", href: "/estate-management" },
    ],
  },
  {
    heading: "By Role",
    items: [
      { label: "Estate Managers", href: "/estate-management" },
      { label: "Property Managers", href: "/tenant-management" },
      { label: "Landlords", href: "/tenant-management" },
      { label: "Security Teams", href: "/#security-gate" },
    ],
  },
  {
    heading: "By Business",
    items: [{ label: "Shortlet Operators", href: "/shortlet-management" }],
  },
];

// Only real destinations — no Help Center/FAQ/Blog until they actually exist.
export const RESOURCES_ITEMS: NavItem[] = [
  { label: "How It Works", href: "/#how-it-works", description: "The estate → residents → security workflow, step by step." },
  { label: "Resident App", href: "/resident-app", description: "What residents can do from their phone." },
];

export const ABOUT_ITEMS: NavItem[] = [
  { label: "Why NidraQ", href: "/security", description: "How NidraQ protects your community's data and operations." },
  { label: "Contact Us", href: "mailto:hello@nidraq.com", description: "Talk to the NidraQ team." },
  { label: "Request a Demo", href: "/request-demo", description: "See NidraQ running with your estate's own structure." },
];

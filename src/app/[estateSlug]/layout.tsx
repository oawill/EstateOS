import Image from "next/image";
import { Role } from "@prisma/client";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { isShortletEnabled } from "@/server/modules/shortlet/settings";
import { EstateNav, type EstateNavItem } from "./EstateNav";

// Grouped to match the EstateOS Finance/Access/Operations/Community/
// Administration product architecture — hrefs are unchanged from before, so
// no route breaks; this only reorders/relabels/groups existing real pages.
//
// Note: /visitors is gated by "own-visitors:*" (a RESIDENT-only permission —
// it's a resident's own guest-invite list, not an admin visitor-management
// page), so it's deliberately NOT added to ESTATE_ADMIN's nav even though
// ESTATE_ADMIN holds the separate, currently-unused "visitors:*" permission
// grant — no real estate-wide visitor list exists yet to link to, and this
// spec explicitly says not to expose menu items that lead to a blocked page.
const NAV_BY_ROLE: Record<Role, EstateNavItem[]> = {
  [Role.PLATFORM_SUPER_ADMIN]: [],
  [Role.ESTATE_ADMIN]: [
    { href: "dashboard", label: "Overview", group: "Overview" },
    { href: "properties", label: "Properties", group: "People & Property" },
    { href: "residents", label: "Residents", group: "People & Property" },
    { href: "billing", label: "Finance", group: "Finance" },
    { href: "facility", label: "Maintenance", group: "Operations" },
    { href: "utilities", label: "Utilities", group: "Operations" },
    { href: "vendors", label: "Vendors", group: "Operations" },
    { href: "announcements", label: "Announcements", group: "Community" },
    // Estate-admin staff accounts typically aren't Residents, so they land
    // on Moderation (which needs no resident profile) rather than the Feed
    // (which does) — the Community sub-nav still lets them reach every tab.
    { href: "community/moderation", label: "Community", group: "Community" },
    { href: "import", label: "Import", group: "Administration" },
    { href: "settings", label: "Settings", group: "Administration" },
  ],
  [Role.FINANCE]: [
    { href: "dashboard", label: "Overview" },
    { href: "billing", label: "Finance" },
  ],
  [Role.FACILITY_MANAGER]: [
    { href: "dashboard", label: "Overview" },
    { href: "facility", label: "Maintenance" },
    { href: "utilities", label: "Utilities" },
    { href: "vendors", label: "Vendors" },
  ],
  [Role.SECURITY]: [{ href: "gate", label: "Gate" }],
  [Role.RESIDENT]: [
    { href: "dashboard", label: "Home" },
    { href: "visitors", label: "Visitors" },
    { href: "maintenance", label: "Maintenance" },
    { href: "community", label: "Community" },
    { href: "my/utilities", label: "Utilities" },
    { href: "my/bills", label: "My Bills" },
    { href: "notifications", label: "Notifications" },
  ],
  [Role.VENDOR]: [{ href: "jobs", label: "My Jobs" }],
};

export default async function EstateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ estateSlug: string }>;
}) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));
  const nav = [...NAV_BY_ROLE[membership.role]];

  // Shortlet is a separately-entitled module (see platform admin's Shortlet
  // toggle) with its own nav/layout under /shortlet — this is the one entry
  // point into it from the residential experience, not a merged nav item.
  const shortletEnabled = await isShortletEnabled(membership.estateId);
  if (shortletEnabled && hasPermission(membership.role, "shortlet-properties:*")) {
    nav.push({ href: "shortlet", label: "Shortlet", group: "Shortlet" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="EstateOS" width={32} height={32} className="rounded-md" />
            <div>
              <p className="text-sm font-semibold">{membership.estateName}</p>
              <p className="text-xs text-foreground-muted">
                {user.name} · {membership.role.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-foreground-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
        <EstateNav estateSlug={estateSlug} nav={nav} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

import Image from "next/image";
import { Role } from "@prisma/client";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { isShortletEnabled } from "@/server/modules/shortlet/settings";
import { EstateNav } from "./EstateNav";

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  [Role.PLATFORM_SUPER_ADMIN]: [],
  [Role.ESTATE_ADMIN]: [
    { href: "dashboard", label: "Dashboard" },
    { href: "properties", label: "Properties" },
    { href: "residents", label: "Residents" },
    { href: "billing", label: "Billing" },
    { href: "facility", label: "Facility" },
    { href: "utilities", label: "Utilities" },
    { href: "announcements", label: "Announcements" },
    // Estate-admin staff accounts typically aren't Residents, so they land
    // on Moderation (which needs no resident profile) rather than the Feed
    // (which does) — the Community sub-nav still lets them reach every tab.
    { href: "community/moderation", label: "Community" },
    { href: "import", label: "Import" },
    { href: "settings", label: "Settings" },
  ],
  [Role.FINANCE]: [
    { href: "dashboard", label: "Dashboard" },
    { href: "billing", label: "Billing" },
  ],
  [Role.FACILITY_MANAGER]: [
    { href: "dashboard", label: "Dashboard" },
    { href: "facility", label: "Facility" },
    { href: "utilities", label: "Utilities" },
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
    nav.push({ href: "shortlet", label: "Shortlet" });
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

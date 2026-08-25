import Link from "next/link";
import { Role } from "@prisma/client";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  [Role.PLATFORM_SUPER_ADMIN]: [],
  [Role.ESTATE_ADMIN]: [
    { href: "dashboard", label: "Dashboard" },
    { href: "properties", label: "Properties" },
    { href: "residents", label: "Residents" },
    { href: "billing", label: "Billing" },
    { href: "import", label: "Import" },
    { href: "settings", label: "Settings" },
  ],
  [Role.FINANCE]: [
    { href: "dashboard", label: "Dashboard" },
    { href: "billing", label: "Billing" },
  ],
  [Role.FACILITY_MANAGER]: [{ href: "dashboard", label: "Dashboard" }],
  [Role.SECURITY]: [{ href: "dashboard", label: "Gate" }],
  [Role.RESIDENT]: [
    { href: "dashboard", label: "Home" },
    { href: "my/bills", label: "My Bills" },
  ],
  [Role.VENDOR]: [{ href: "dashboard", label: "My Jobs" }],
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
  const nav = NAV_BY_ROLE[membership.role];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{membership.estateName}</p>
            <p className="text-xs text-slate-500">
              {user.name} · {membership.role.replaceAll("_", " ")}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
        {nav.length > 0 && (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={`/${estateSlug}/${item.href}`}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

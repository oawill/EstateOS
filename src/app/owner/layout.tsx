import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { OwnerMobileNav } from "./OwnerMobileNav";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  // Today the only owner relationship NidraQ can authorize is Tenant
  // Management's PropertyOwner — an Estate Executive context and a
  // Shortlet Owner context are architected for (see the portfolio context
  // switcher's design) but have no backing ownership model yet, so this
  // guard stays narrow rather than pretending a broader identity exists.
  const { user } = await guardPage(async () => requirePropertyOwner(await requireUser()));

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 sm:pb-0">
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <Link href="/owner" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="NidraQ" width={30} height={30} className="rounded-md" />
            <div>
              <p className="text-sm font-semibold">NidraQ Owner</p>
              <p className="text-xs text-white/60">{user.name}</p>
            </div>
          </Link>
          <div className="hidden items-center gap-5 sm:flex">
            <Link href="/owner" className="text-sm font-medium text-white/70 hover:text-white">
              Home
            </Link>
            <Link href="/owner/portfolio" className="text-sm font-medium text-white/70 hover:text-white">
              Portfolio
            </Link>
            <Link href="/owner/reports" className="text-sm font-medium text-white/70 hover:text-white">
              Reports
            </Link>
            <Link href="/owner/more" className="text-sm font-medium text-white/70 hover:text-white">
              More
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-sm text-white/70 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <OwnerMobileNav />
    </div>
  );
}

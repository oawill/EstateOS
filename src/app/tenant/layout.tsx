import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";

export default async function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await guardPage(async () => requireTenantSelf(await requireUser()));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/tenant" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="NidraQ" width={28} height={28} className="rounded-md" />
            <div>
              <p className="text-sm font-semibold">My Home</p>
              <p className="text-xs text-slate-300">{user.name}</p>
            </div>
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-slate-300 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

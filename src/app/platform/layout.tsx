import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";

const NAV = [
  { href: "/platform", label: "Dashboard" },
  { href: "/platform/estates", label: "Estates" },
  { href: "/platform/plans", label: "Plans" },
  { href: "/platform/users", label: "Users" },
  { href: "/platform/audit", label: "Audit" },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await guardPage(() => requirePlatformAdmin());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="EstateOS" width={32} height={32} className="rounded-md" />
            <div>
              <p className="text-sm font-semibold">EstateOS Platform Admin</p>
              <p className="text-xs text-slate-300">{user.name}</p>
            </div>
          </div>
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
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

import { signOut } from "@/server/auth/config";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await guardPage(() => requirePlatformAdmin());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">EstateOS Platform Admin</p>
            <p className="text-xs text-slate-300">{user.name}</p>
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
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

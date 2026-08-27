import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { isShortletEnabled } from "@/server/modules/shortlet/settings";
import { ShortletNav } from "./ShortletNav";

/**
 * A self-contained header/nav, deliberately not merged into EstateLayout's
 * residential nav — this is the "separate but one account" boundary the
 * Shortlet spec asks for. Gated on both the platform-controlled entitlement
 * (ShortletSettings.enabled) and RBAC, with a 404 (not a redirect) when the
 * module isn't enabled for this estate, matching how a wrong-tenant slug
 * behaves elsewhere in this app.
 */
export default async function ShortletLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ estateSlug: string }>;
}) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "shortlet-properties:*"));

  const enabled = await isShortletEnabled(membership.estateId);
  if (!enabled) notFound();

  return (
    <div className="-mx-4 -my-8 min-h-screen bg-background">
      <header className="border-b border-border bg-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">EstateOS Shortlet</p>
            <p className="text-xs text-white/60">{membership.estateName}</p>
          </div>
          <Link href={`/${estateSlug}/dashboard`} className="text-sm font-medium text-white/70 hover:text-white">
            ← Back to {membership.estateName}
          </Link>
        </div>
        <div className="border-t border-white/10">
          <ShortletNav estateSlug={estateSlug} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

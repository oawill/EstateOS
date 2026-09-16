import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { TenantManagementNav } from "./TenantManagementNav";

export default async function PlatformTenantManagementLayout({ children }: { children: React.ReactNode }) {
  await guardPage(() => requirePlatformAdmin());

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tenant Management Oversight</h1>
        <p className="text-sm text-foreground-muted">
          Platform-wide view across every landlord&apos;s portfolio — properties, tenants, leases, rent and maintenance.
        </p>
      </div>
      <TenantManagementNav />
      {children}
    </div>
  );
}

import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { getEstateLocale, listBlocks, listStreets, listZones } from "@/server/modules/estates/service";
import { getOrCreateCommunitySettings, listClassifiedCategories } from "@/server/modules/community/settings";
import { GeographySection } from "./GeographySection";
import { CommunitySettingsSection } from "./CommunitySettingsSection";
import { LocaleSection } from "./LocaleSection";

export default async function SettingsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const [blocks, streets, zones, communitySettings, categories, locale] = await Promise.all([
    listBlocks(membership.estateId),
    listStreets(membership.estateId),
    listZones(membership.estateId),
    getOrCreateCommunitySettings(membership.estateId),
    listClassifiedCategories(membership.estateId),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Estate settings</h1>
      <p className="text-sm text-slate-500">
        Define blocks, streets, and zones so properties can be organized and announcements/charges can target them.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <GeographySection estateSlug={estateSlug} kind="block" title="Blocks" items={blocks} />
        <GeographySection estateSlug={estateSlug} kind="street" title="Streets" items={streets} />
        <GeographySection estateSlug={estateSlug} kind="zone" title="Zones" items={zones} />
      </div>
      <LocaleSection estateSlug={estateSlug} locale={locale} />
      <CommunitySettingsSection
        estateSlug={estateSlug}
        settings={communitySettings}
        categories={categories.map((c) => ({ id: c.id, label: c.label, isActive: c.isActive }))}
      />
    </div>
  );
}

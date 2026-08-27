import Link from "next/link";
import { Badge, Button, Card, Input, Select } from "@/components/shared/ui";
import { formatNaira } from "@/lib/utils";
import { LISTING_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listListings } from "@/server/modules/community/classifieds";
import { listClassifiedCategories } from "@/server/modules/community/settings";

export default async function ClassifiedsPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string; sort?: string }>;
}) {
  const { estateSlug } = await params;
  const query = await searchParams;

  const { listings, categories } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "community-listings:*");
    const [listings, categories] = await Promise.all([
      listListings(membership.estateId, {
        keyword: query.q || undefined,
        categoryKey: query.category || undefined,
        minPriceKobo: query.min ? Math.round(Number(query.min) * 100) : undefined,
        maxPriceKobo: query.max ? Math.round(Number(query.max) * 100) : undefined,
        sort: query.sort === "updated" ? "updated" : "newest",
      }),
      listClassifiedCategories(membership.estateId, true),
    ]);
    return { listings, categories };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Classifieds</h2>
        <Link href={`/${estateSlug}/community/classifieds/new`}>
          <Button type="button">New listing</Button>
        </Link>
      </div>

      <Card>
        <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Input name="q" defaultValue={query.q ?? ""} placeholder="Search keyword" className="col-span-2 sm:col-span-1" />
          <Select name="category" defaultValue={query.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
          <Input name="min" type="number" defaultValue={query.min ?? ""} placeholder="Min ₦" />
          <Input name="max" type="number" defaultValue={query.max ?? ""} placeholder="Max ₦" />
          <Select name="sort" defaultValue={query.sort ?? "newest"}>
            <option value="newest">Newest</option>
            <option value="updated">Recently updated</option>
          </Select>
          <div className="col-span-2 flex gap-2 sm:col-span-5">
            <Button type="submit" variant="secondary">
              Search
            </Button>
            <Link href={`/${estateSlug}/community/classifieds`}>
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listings.length === 0 && <p className="text-sm text-foreground-muted">No listings match these filters.</p>}
        {listings.map((listing) => (
          <Link key={listing.id} href={`/${estateSlug}/community/classifieds/${listing.id}`}>
            <Card className="h-full hover:border-primary/40">
              {listing.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.images[0].url} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{listing.title}</p>
                <Badge tone={LISTING_STATUS_TONE[listing.status]}>{listing.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-foreground-muted">{listing.category.label}</p>
              <p className="mt-1 font-medium text-primary">
                {listing.priceKobo ? formatNaira(listing.priceKobo) : "Free"}
                {listing.negotiable ? " · Negotiable" : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

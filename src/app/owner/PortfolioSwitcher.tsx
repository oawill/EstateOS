"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OwnerExecutiveEstate } from "@/server/modules/owner/access";

/**
 * A plain set of links, not a JS dropdown — with at most a handful of
 * contexts (rental portfolio + the estates someone executively oversees),
 * this is simpler and just as fast (spec section 55/56).
 */
export function PortfolioSwitcher({
  hasRentalPortfolio,
  executiveEstates,
}: {
  hasRentalPortfolio: boolean;
  executiveEstates: OwnerExecutiveEstate[];
}) {
  const pathname = usePathname();

  if (!hasRentalPortfolio && executiveEstates.length <= 1) return null;

  const isRentalsActive = !pathname.startsWith("/owner/estates");

  return (
    <div className="border-b border-white/10 bg-navy-deep">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2">
        {hasRentalPortfolio && (
          <Link
            href="/owner"
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
              isRentalsActive ? "bg-white text-navy-deep" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Rental Properties
          </Link>
        )}
        {executiveEstates.map((estate) => {
          const isActive = pathname.startsWith(`/owner/estates/${estate.id}`);
          return (
            <Link
              key={estate.id}
              href={`/owner/estates/${estate.id}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                isActive ? "bg-white text-navy-deep" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {estate.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface EstateNavItem {
  href: string;
  label: string;
  /** Optional cluster name (Overview/People & Property/Finance/Access/Operations/Community/Administration) — when it differs from the previous item's group, a subtle divider renders before it. Purely a visual grouping cue, not a new navigation mechanism. */
  group?: string;
}

export function EstateNav({ estateSlug, nav }: { estateSlug: string; nav: EstateNavItem[] }) {
  const pathname = usePathname();

  if (nav.length === 0) return null;

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {nav.map((item, i) => {
        const fullHref = `/${estateSlug}/${item.href}`;
        const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
        const startsNewGroup = i > 0 && item.group && item.group !== nav[i - 1].group;
        return (
          <Link
            key={item.href}
            href={fullHref}
            className={
              (isActive
                ? "whitespace-nowrap rounded-lg border-b-2 border-primary px-3 py-1.5 text-sm font-medium text-primary"
                : "whitespace-nowrap rounded-lg border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted") +
              (startsNewGroup ? " ml-2 border-l border-border pl-4" : "")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Feed" },
  { href: "classifieds", label: "Classifieds" },
  { href: "recommendations", label: "Recommendations" },
  { href: "events", label: "Events" },
  { href: "groups", label: "Groups" },
  { href: "my-posts", label: "My Posts" },
  { href: "saved", label: "Saved" },
];

export function CommunityTabs({ estateSlug, showModeration }: { estateSlug: string; showModeration: boolean }) {
  const pathname = usePathname();
  const base = `/${estateSlug}/community`;
  const tabs = showModeration ? [...TABS, { href: "moderation", label: "Moderation" }] : TABS;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-2">
      {tabs.map((tab) => {
        const href = tab.href ? `${base}/${tab.href}` : base;
        const isActive = tab.href ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={tab.href}
            href={href}
            className={
              isActive
                ? "whitespace-nowrap rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

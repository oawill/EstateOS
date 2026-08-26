"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EstateNav({ estateSlug, nav }: { estateSlug: string; nav: { href: string; label: string }[] }) {
  const pathname = usePathname();

  if (nav.length === 0) return null;

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {nav.map((item) => {
        const fullHref = `/${estateSlug}/${item.href}`;
        const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
        return (
          <Link
            key={item.href}
            href={fullHref}
            className={
              isActive
                ? "whitespace-nowrap rounded-lg border-b-2 border-primary px-3 py-1.5 text-sm font-medium text-primary"
                : "whitespace-nowrap rounded-lg border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Only real, working destinations — the reference design's Pricing/
// Solutions/Modules/Resources/About Us/legal pages don't exist in this app
// (no pricing model, no marketing/legal content anywhere), so rather than
// link to pages that don't exist, the footer stays intentionally small.
const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#shortlet", label: "Shortlet" },
  { href: "/security", label: "Security" },
  { href: "/login", label: "Log In" },
  { href: "/request-demo", label: "Request a Demo" },
];

/**
 * The single shared footer — currently only rendered on the public landing
 * page (no authenticated layout has a footer today). Update here, not
 * per-page, if a footer is ever added elsewhere.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-navy-deep text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt={BRAND.name} width={28} height={28} className="rounded-md" />
              <span className="text-sm font-semibold">{BRAND.name}</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-white/60">{BRAND.tagline}</p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-white/70 hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1.5 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:justify-between">
          <p className="flex flex-col items-center gap-0.5 text-center sm:flex-row sm:gap-1.5 sm:text-left">
            <span>© {year} {BRAND.name}. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden="true">
              |
            </span>
            <span>A Cicerah Technologies Limited Company.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

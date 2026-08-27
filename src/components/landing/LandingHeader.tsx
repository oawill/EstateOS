import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { MobileNav } from "./MobileNav";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#shortlet", label: "Shortlet" },
  { href: "#security", label: "Security" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-deep/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="EstateOS" width={32} height={32} className="rounded-md" priority />
          <span className="text-sm font-semibold text-white">EstateOS</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white">
            Log In
          </Link>
          <Link href="/request-demo">
            <Button type="button">Request a Demo</Button>
          </Link>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { BRAND } from "@/lib/brand";
import { MobileNav } from "./MobileNav";
import { NavDropdown } from "./NavDropdown";
import { ABOUT_ITEMS, PRODUCT_GROUPS, RESOURCES_ITEMS, SOLUTIONS_GROUPS } from "./navigation";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/10 bg-navy-deep/95 backdrop-blur transition-[padding,box-shadow] duration-200 ${
        scrolled ? "shadow-lg shadow-black/20" : ""
      }`}
    >
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-[padding] duration-200 ${scrolled ? "py-2.5" : "py-3.5"}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt={BRAND.name} width={32} height={32} className="rounded-md" priority />
          <span className="text-sm font-semibold text-white">{BRAND.name}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          <NavDropdown label="Product" groups={PRODUCT_GROUPS} wide />
          <NavDropdown label="Solutions" groups={SOLUTIONS_GROUPS} wide />
          <NavDropdown label="Resources" items={RESOURCES_ITEMS} />
          <NavDropdown label="About" items={ABOUT_ITEMS} />
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white">
            Staff Login
          </Link>
          <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white">
            Resident Login
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

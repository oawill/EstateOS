"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/ui";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#security-gate", label: "Security" },
  { href: "#shortlet", label: "Shortlet" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <div id="mobile-nav-panel" className="absolute inset-x-0 top-full border-t border-white/10 bg-navy-deep px-4 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white">
              Log In
            </Link>
            <Link href="/request-demo" onClick={() => setOpen(false)}>
              <Button type="button" className="w-full">
                Request a Demo
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

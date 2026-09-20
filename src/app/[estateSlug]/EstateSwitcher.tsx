"use client";

import { useState } from "react";
import Link from "next/link";

interface Membership {
  estate: { slug: string; name: string };
}

/** Resident-only header control — a resident who owns/rents more than one NidraQ property can switch between them without going back to the root property picker. Never shown to managers/security/vendors, who aren't expected to hold multiple estate memberships. */
export function EstateSwitcher({ memberships, currentSlug }: { memberships: Membership[]; currentSlug: string }) {
  const [open, setOpen] = useState(false);
  const current = memberships.find((m) => m.estate.slug === currentSlug);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-semibold text-foreground"
      >
        {current?.estate.name ?? "Switch property"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
            {memberships.map((m) => (
              <Link
                key={m.estate.slug}
                href={`/${m.estate.slug}/dashboard`}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  m.estate.slug === currentSlug ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-surface-muted"
                }`}
              >
                {m.estate.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

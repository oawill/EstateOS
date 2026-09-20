"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { ABOUT_ITEMS, PRODUCT_GROUPS, RESOURCES_ITEMS, SOLUTIONS_GROUPS, type NavGroup, type NavItem } from "./navigation";

const SECTIONS: { label: string; groups?: NavGroup[]; items?: NavItem[] }[] = [
  { label: "Product", groups: PRODUCT_GROUPS },
  { label: "Solutions", groups: SOLUTIONS_GROUPS },
  { label: "Resources", items: RESOURCES_ITEMS },
  { label: "About", items: ABOUT_ITEMS },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function close() {
    setOpen(false);
    setExpanded(null);
  }

  return (
    <div className="lg:hidden">
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
        <div id="mobile-nav-panel" className="absolute inset-x-0 top-full max-h-[calc(100vh-56px)] overflow-y-auto border-t border-white/10 bg-navy-deep px-4 py-4">
          <div className="flex flex-col gap-1">
            {SECTIONS.map((section) => {
              const isOpen = expanded === section.label;
              const flatItems = section.groups ? section.groups.flatMap((g) => g.items) : (section.items ?? []);
              return (
                <div key={section.label} className="border-b border-white/10 last:border-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : section.label)}
                    className="flex w-full items-center justify-between px-3 py-3.5 text-left text-sm font-medium text-white/90"
                  >
                    {section.label}
                    <ChevronIcon open={isOpen} />
                  </button>
                  {isOpen && (
                    <div className="pb-2">
                      {section.groups
                        ? section.groups.map((group) => (
                            <div key={group.heading} className="mb-2">
                              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">{group.heading}</p>
                              {group.items.map((item) => (
                                <Link
                                  key={item.label}
                                  href={item.href}
                                  onClick={close}
                                  className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                                >
                                  {item.label}
                                </Link>
                              ))}
                            </div>
                          ))
                        : flatItems.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={close}
                              className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                            >
                              {item.label}
                            </Link>
                          ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link href="/login" onClick={close} className="rounded-lg px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              Staff Login
            </Link>
            <Link href="/login" onClick={close} className="rounded-lg px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              Resident Login
            </Link>
            <Link href="/request-demo" onClick={close}>
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

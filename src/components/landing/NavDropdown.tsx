"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup, NavItem } from "./navigation";

function pathOf(href: string): string {
  return href.split("#")[0] || "/";
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One dropdown trigger, used for both the wide Product/Solutions mega
 * menus (`groups`) and the narrower Resources/About lists (`items`).
 * Click-to-open rather than hover — robust on trackpads/tablets and
 * simple to test, unlike a hover+timeout dropdown.
 */
export function NavDropdown({ label, groups, items, wide }: { label: string; groups?: NavGroup[]; items?: NavItem[]; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  const allHrefs = groups ? groups.flatMap((g) => g.items.map((i) => i.href)) : (items ?? []).map((i) => i.href);
  const isActive = allHrefs.some((href) => pathOf(href) !== "/" && pathname.startsWith(pathOf(href)));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "text-white" : "text-white/70 hover:text-white"
        } hover:bg-white/10`}
      >
        {label}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          className={`animate-fade-in absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 rounded-2xl border border-white/10 bg-navy p-5 shadow-2xl ${
            wide ? "w-[640px]" : "w-72"
          }`}
        >
          {groups ? (
            <div className="grid grid-cols-3 gap-6">
              {groups.map((group) => (
                <div key={group.heading}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{group.heading}</p>
                  <ul className="mt-2.5 space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-white/5"
                        >
                          {item.icon && <span className="mt-0.5 shrink-0 text-primary-light">{item.icon}</span>}
                          <span>
                            <span className="block text-sm font-medium text-white">{item.label}</span>
                            {item.description && <span className="mt-0.5 block text-xs leading-snug text-white/50">{item.description}</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {(items ?? []).map((item) => (
                <li key={item.label}>
                  <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-lg p-2.5 hover:bg-white/5">
                    <span className="block text-sm font-medium text-white">{item.label}</span>
                    {item.description && <span className="mt-0.5 block text-xs leading-snug text-white/50">{item.description}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

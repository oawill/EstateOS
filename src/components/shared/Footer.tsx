import Link from "next/link";

/**
 * The single shared footer — currently only rendered on the public landing
 * page (no authenticated layout has a footer today). Update here, not
 * per-page, if a footer is ever added elsewhere.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-col items-center gap-0.5 text-center sm:flex-row sm:gap-1.5 sm:text-left">
          <span>© {year} EstateOS. All rights reserved.</span>
          <span className="hidden sm:inline" aria-hidden="true">
            |
          </span>
          <span>A Cicerah Technologies Limited Company.</span>
        </p>
        <Link href="/login" className="font-medium text-foreground-muted hover:text-foreground">
          Sign in
        </Link>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { ProductPreview } from "./ProductPreview";

export function Hero() {
  return (
    <section className="gradient-premium text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold tracking-wide text-white/60">
            THE OPERATING SYSTEM
            <br />
            FOR MODERN COMMUNITIES
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop Running Your Community Through{" "}
            <span className="text-primary">WhatsApp, Spreadsheets and Bank Transfers.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            EstateOS brings residents, payments, security, visitors, utilities, maintenance and community operations
            into one connected platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/request-demo">
              <Button type="button">Request a Demo</Button>
            </Link>
            <a href="#features">
              <Button type="button" variant="secondary" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10">
                See How It Works
              </Button>
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
            <div>
              <dt className="font-semibold text-white">Secure</dt>
              <dd className="mt-0.5 text-white/60">Role-based access control</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Reliable</dt>
              <dd className="mt-0.5 text-white/60">Built for always-on operations</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Trusted</dt>
              <dd className="mt-0.5 text-white/60">By communities and operators</dd>
            </div>
          </dl>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}

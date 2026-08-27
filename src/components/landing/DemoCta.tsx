import Link from "next/link";
import { Button } from "@/components/shared/ui";

export function DemoCta() {
  return (
    <section className="bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to transform how your community runs?</h2>
          <p className="mt-2 text-white/60">Book a personalized demonstration and see EstateOS in action.</p>
        </div>
        <Link href="/request-demo">
          <Button type="button">Request a Demo</Button>
        </Link>
      </div>
    </section>
  );
}

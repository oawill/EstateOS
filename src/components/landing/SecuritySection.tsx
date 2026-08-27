import Link from "next/link";
import { Button } from "@/components/shared/ui";

const PILLARS = [
  {
    title: "Private by Design",
    description: "Each community's information is securely separated and protected, with no visibility into another community's data.",
  },
  {
    title: "Controlled Access",
    description: "Residents, security teams, finance staff and administrators only see the tools and information their role requires.",
  },
  {
    title: "Complete Accountability",
    description: "Key administrative and operational actions are recorded, so changes can be reviewed and understood after the fact.",
  },
  {
    title: "Secure Payments",
    description: "Payment verification and financial workflows are handled through secure, server-side processes — never trusted from the browser.",
  },
] as const;

export function SecuritySection() {
  return (
    <section id="trust" className="gradient-premium text-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Your Community. <span className="text-primary">Your Data.</span>
          </h2>
          <p className="mt-4 text-slate-300">
            NidraQ is designed to protect community information while giving residents, security teams, finance
            teams and administrators access only to the tools and information they need.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="font-medium text-white">{pillar.title}</p>
              <p className="mt-1.5 text-sm text-slate-300">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/security">
            <Button type="button" variant="secondary" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10">
              Learn About NidraQ Security
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

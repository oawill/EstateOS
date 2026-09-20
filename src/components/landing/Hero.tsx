import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { ProductPreview } from "./ProductPreview";

const VALUE_PILLARS = [
  {
    label: "Safer Communities",
    icon: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: "Easier Payments",
    icon: <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: "Efficient Operations",
    icon: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: "Stronger Communities",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="16" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5M15 14.7c2.8.3 4.5 2.3 4.5 5.3" strokeLinecap="round" />
      </>
    ),
  },
] as const;

export function Hero() {
  return (
    <section className="gradient-premium text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="inline-block border-l-2 border-primary pl-3 text-xs font-semibold tracking-wide text-white/60">
            SMARTER PROPERTIES. HAPPIER PEOPLE.
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            More than property software.
            <br />
            <span className="text-primary">A better tomorrow.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            NidraQ brings estates, rentals and shortlets together on one platform — connecting homes, people and
            communities for safer, smarter operations.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/signup">
              <Button type="button">Get Started</Button>
            </Link>
            <Link href="/request-demo">
              <Button type="button" variant="secondary" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10">
                Request a Demo
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            {VALUE_PILLARS.map((pillar) => (
              <div key={pillar.label} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-light" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {pillar.icon}
                  </svg>
                </span>
                <p className="text-xs font-medium text-white/80">{pillar.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}

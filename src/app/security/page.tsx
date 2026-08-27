import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/shared/ui";

export const metadata: Metadata = {
  title: "NidraQ Security & Trust | Protecting Community Operations",
  description:
    "How NidraQ protects community data — tenant isolation, role-based access, administrative audit trails and secure payment verification for estates and shortlet operators across Nigeria and Africa.",
};

const SECTIONS = [
  {
    title: "Data Isolation",
    body: "Every community's records — residents, units, payments, visitors, maintenance and more — are scoped to that community at the data-access layer. Application code always reads and writes through this scoping, so a request for one community's data cannot return another community's records.",
  },
  {
    title: "Authentication",
    body: "Users sign in with an email and password. Passwords are never stored in plain text — they're hashed before being saved, and every login is verified against that hash. Signed-in sessions use industry-standard JSON Web Tokens.",
  },
  {
    title: "Authorization",
    body: "Every user is assigned a role — such as Administrator, Finance, Facility Manager, Security or Resident — and each role has a defined set of permissions. Server-side checks enforce those permissions on every request; the interface a user sees reflects what their role is actually allowed to do.",
  },
  {
    title: "Administrative Security",
    body: "Privileged functionality — managing residents, finance records, platform settings and estate configuration — is restricted to roles authorized for that function, and is enforced on the server, not just hidden in the interface.",
  },
  {
    title: "Auditability",
    body: "Significant administrative and operational actions — such as changes to billing, resident records and maintenance tickets — are recorded with who made the change and when, so they can be reviewed later. This is a record of tracked actions, not a claim that literally every interaction is logged.",
  },
  {
    title: "Payments",
    body: "Payments are processed through Paystack. NidraQ does not receive or store card numbers — that's handled by Paystack's own secure checkout. When a payment completes, Paystack notifies NidraQ through a webhook that is cryptographically signature-verified on the server before any payment is recorded; a payment is never marked successful based on what the browser reports.",
  },
  {
    title: "Data Protection",
    body: "Access to community data follows the same role-based and community-scoped rules described above, whether that data is viewed, exported or reported on. We aim to collect and retain only the information needed to operate the platform.",
  },
  {
    title: "Infrastructure",
    body: "NidraQ runs on established cloud infrastructure with managed, encrypted database hosting. Traffic to the platform is encrypted in transit.",
  },
] as const;

export default function SecurityPage() {
  return (
    <main className="flex-1">
      <LandingHeader />

      <section className="gradient-premium text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Security & Trust</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Your Community. <span className="text-primary">Your Data.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            NidraQ is designed to protect community information while giving residents, security teams, finance
            teams and administrators access only to the tools and information they need.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border bg-surface-muted p-6">
          <h2 className="text-lg font-semibold tracking-tight">Responsible Security Contact</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            If you believe you&apos;ve found a security issue affecting NidraQ, please contact us at{" "}
            <a href="mailto:security@nidraq.com" className="font-medium text-primary hover:underline">
              security@nidraq.com
            </a>{" "}
            so we can investigate. We ask that you give us a reasonable opportunity to address any issue before
            disclosing it publicly.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/request-demo">
            <Button type="button">Request a Demo</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

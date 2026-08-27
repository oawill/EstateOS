import Image from "next/image";
import Link from "next/link";
import { DemoRequestForm } from "./DemoRequestForm";

export default function RequestDemoPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/logo.svg" alt="EstateOS" width={40} height={40} className="rounded-lg" priority />
          <span className="text-lg font-semibold">EstateOS</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Request a Demo</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Tell us about your community and we&apos;ll be in touch to arrange a walkthrough.
        </p>
      </div>
      <DemoRequestForm />
    </main>
  );
}

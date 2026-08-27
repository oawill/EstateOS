import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/">
            <Image src="/logo.svg" alt="NidraQ" width={56} height={56} className="mx-auto rounded-xl" priority />
          </Link>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground-muted">NidraQ</h2>
        </div>
        <Card>
          <ForgotPasswordForm />
        </Card>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { getResetTokenValidity } from "@/server/auth/passwordReset/service";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { InvalidLink } from "./InvalidLink";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Read-only check at page load — the actual password change re-validates
  // and consumes the token server-side again, so this is a UX shortcut
  // (don't show a form for a link that's obviously dead), never the
  // authority on whether the reset is allowed.
  const validity = token ? await getResetTokenValidity(token) : "invalid";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/">
            <Image src="/logo.svg" alt="EstateOS" width={56} height={56} className="mx-auto rounded-xl" priority />
          </Link>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground-muted">EstateOS</h2>
        </div>
        <Card>{validity === "valid" && token ? <ResetPasswordForm token={token} /> : <InvalidLink />}</Card>
      </div>
    </main>
  );
}

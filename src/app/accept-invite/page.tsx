import Image from "next/image";
import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { checkResidentInvite } from "@/server/modules/residents/invite";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { validity, details } = token
    ? await checkResidentInvite(token)
    : { validity: "invalid" as const, details: undefined };

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
          {validity === "valid" && token && details ? (
            <AcceptInviteForm
              token={token}
              estateName={details.estateName}
              firstName={details.firstName}
              email={details.email}
              hasExistingAccount={details.hasExistingAccount}
            />
          ) : (
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold tracking-tight">This invitation is no longer valid</h1>
              <p className="text-sm text-foreground-muted">
                Invitations expire after 7 days or become invalid after being used. Ask your estate management team
                to send a new one.
              </p>
              <Link href="/login">
                <Button type="button" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

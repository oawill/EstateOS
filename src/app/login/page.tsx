import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const { passwordChanged } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Image src="/logo.svg" alt="NidraQ" width={56} height={56} className="mx-auto rounded-xl" priority />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">NidraQ</h1>
          <p className="mt-1 text-sm text-foreground-muted">Sign in to your estate</p>
        </div>
        {passwordChanged && (
          <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success">
            Your password was changed. Please sign in again.
          </p>
        )}
        <Card>
          <LoginForm />
        </Card>
        <p className="text-center text-sm text-foreground-muted">
          New estate?{" "}
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

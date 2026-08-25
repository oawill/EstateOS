import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your role doesn&apos;t include this permission. If you think this is a mistake, contact your estate
          administrator.
        </p>
        <Link href="/">
          <Button className="mt-6 w-full" variant="secondary">
            Back to dashboard
          </Button>
        </Link>
      </Card>
    </main>
  );
}

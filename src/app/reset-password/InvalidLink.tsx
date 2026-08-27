import Link from "next/link";
import { Button } from "@/components/shared/ui";

export function InvalidLink() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">This reset link is no longer valid</h1>
      <p className="text-sm text-foreground-muted">
        For your security, password reset links expire after a limited period or become invalid after use.
      </p>
      <Link href="/forgot-password">
        <Button type="button" className="w-full">
          Request a New Reset Link
        </Button>
      </Link>
    </div>
  );
}

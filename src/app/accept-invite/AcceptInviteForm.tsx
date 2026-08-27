"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, FormError, Label } from "@/components/shared/ui";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { acceptInviteAction, type AcceptInviteFormState } from "./actions";

const initialState: AcceptInviteFormState = { status: "idle" };

export function AcceptInviteForm({
  token,
  estateName,
  firstName,
  email,
  hasExistingAccount,
}: {
  token: string;
  estateName: string;
  firstName: string;
  email: string;
  hasExistingAccount: boolean;
}) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  if (state.status === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">This invitation is no longer valid</h1>
        <p className="text-sm text-foreground-muted">
          Invitations expire after 7 days or become invalid after being used. Ask your estate management team to
          send a new one.
        </p>
        <Link href="/login" className="block text-sm font-medium text-primary underline underline-offset-4">
          Back to Sign In
        </Link>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to EstateOS</h1>
        <p className="text-sm text-foreground-muted">
          Your resident account for {estateName} is ready. Sign in to view your bills, invite visitors, and more.
        </p>
        <Link href="/login">
          <Button type="button" className="w-full">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Hi {firstName}, welcome to {estateName}</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {hasExistingAccount
            ? `We found an existing EstateOS account for ${email} — accept below to link your resident access to it.`
            : `Create a password for ${email} to activate your EstateOS resident portal.`}
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="requiresPassword" value={hasExistingAccount ? "false" : "true"} />
        {!hasExistingAccount && (
          <>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-requirements"
              />
              <p id="password-requirements" className="mt-1.5 text-xs text-foreground-muted">
                Must be at least 8 characters.
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={mismatch}
                aria-describedby={mismatch ? "confirm-password-error" : undefined}
              />
              {mismatch && (
                <p id="confirm-password-error" role="alert" className="mt-1.5 text-xs text-danger">
                  Passwords do not match.
                </p>
              )}
            </div>
          </>
        )}
        <Button type="submit" className="w-full" disabled={pending || mismatch}>
          {pending ? "Activating…" : hasExistingAccount ? "Link My Account" : "Activate My Account"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, FormError, Label } from "@/components/shared/ui";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { resetPasswordAction, type ResetPasswordFormState } from "./actions";
import { InvalidLink } from "./InvalidLink";

const initialState: ResetPasswordFormState = { status: "idle" };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (state.status === "invalid") {
    return <InvalidLink />;
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-sm text-foreground-muted">
          Your EstateOS password has been changed successfully. You can now sign in using your new password.
        </p>
        <Link href="/login">
          <Button type="button" className="w-full">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-foreground-muted">Choose a new password for your EstateOS account.</p>
      </div>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="password">New Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
        <Button type="submit" className="w-full" disabled={pending || mismatch}>
          {pending ? "Resetting…" : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}

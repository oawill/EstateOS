"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Label } from "@/components/shared/ui";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { changePasswordAction, type ChangePasswordFormState } from "./actions";

const initialState: ChangePasswordFormState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="currentPassword">Current Password</Label>
        <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-describedby="new-password-requirements"
        />
        <p id="new-password-requirements" className="mt-1.5 text-xs text-foreground-muted">
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
          aria-describedby={mismatch ? "confirm-new-password-error" : undefined}
        />
        {mismatch && (
          <p id="confirm-new-password-error" role="alert" className="mt-1.5 text-xs text-danger">
            Passwords do not match.
          </p>
        )}
      </div>
      <p className="text-xs text-foreground-muted">
        You&apos;ll be signed out of all devices and asked to sign back in with your new password.
      </p>
      <Button type="submit" disabled={pending || mismatch}>
        {pending ? "Changing password…" : "Change Password"}
      </Button>
    </form>
  );
}

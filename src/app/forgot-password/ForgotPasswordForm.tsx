"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { requestPasswordResetAction, type ForgotPasswordFormState } from "./actions";

const initialState: ForgotPasswordFormState = { status: "idle" };
const RESEND_COOLDOWN_SECONDS = 30;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);
  const [email, setEmail] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // A plain, unconditional ticking clock — cooldown remaining is computed
  // from it during render below, so there's no setState tied to the
  // "sent" transition itself (which server-action state changes can't
  // cleanly drive from a useEffect without extra render passes).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cooldownRemaining = state.sentAt
    ? Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((now - state.sentAt) / 1000))
    : 0;

  if (state.status === "sent") {
    return (
      <div className="space-y-4 text-center" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-foreground-muted">
          If a NidraQ account exists for that email address, we&apos;ve sent password reset instructions.
        </p>
        <div className="border-t border-border pt-4 text-sm text-foreground-muted">
          <p>Didn&apos;t receive the email?</p>
          <form action={formAction} className="mt-2">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={cooldownRemaining > 0 || pending}
              className="font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:text-foreground-muted disabled:no-underline"
            >
              {cooldownRemaining > 0 ? `Resend reset email (${cooldownRemaining}s)` : "Resend reset email"}
            </button>
          </form>
        </div>
        <Link href="/login" className="block text-sm font-medium text-primary underline underline-offset-4">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Enter the email address associated with your NidraQ account and we&apos;ll send you instructions to reset
          your password.
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>
      <Link href="/login" className="block text-center text-sm font-medium text-primary underline underline-offset-4">
        Back to Sign In
      </Link>
    </div>
  );
}

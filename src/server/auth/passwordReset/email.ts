import { Resend } from "resend";

// Same base-URL/Resend pattern as src/server/modules/demoRequests/email.ts
// — AUTH_URL is the app's configured public URL (never localhost/preview
// in production), so reset links always point at the real app.
function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const client = getResendClient();
  if (!client) {
    // Only the hash is ever persisted (see token.ts), so without a real
    // email provider there is no other way to retrieve the raw link — this
    // dev-only console fallback (never reachable in production, since
    // RESEND_API_KEY is always configured there) is what makes local
    // testing of the reset flow possible at all.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[passwordReset/email] RESEND_API_KEY not configured — reset link for ${to}: ${resetUrl}`);
    } else {
      console.warn(`[passwordReset/email] RESEND_API_KEY not configured — skipping reset email to ${to}`);
    }
    return;
  }

  const from = process.env.EMAIL_FROM ?? "NidraQ <onboarding@resend.dev>";

  const text = `Reset your password

We received a request to reset the password for your NidraQ account.

Reset your password: ${resetUrl}

For your security, this link will expire in 1 hour and can only be used once.

If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
`;

  try {
    const result = await client.emails.send({ from, to, subject: "Reset your NidraQ password", text });
    if (result.error) {
      console.error(`[passwordReset/email] Resend rejected reset email:`, result.error);
    }
  } catch (error) {
    console.error(`[passwordReset/email] Failed to send reset email:`, error);
  }
}

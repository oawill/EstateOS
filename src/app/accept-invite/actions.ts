"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { passwordSchema } from "@/server/auth/password";
import { acceptResidentInvite } from "@/server/modules/residents/invite";

const inputSchema = z
  .object({
    token: z.string().min(1),
    requiresPassword: z.coerce.boolean(),
    password: passwordSchema.optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.requiresPassword || data.password, {
    message: "Please choose a password.",
    path: ["password"],
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export interface AcceptInviteFormState {
  status: "idle" | "success" | "invalid";
  error?: string;
}

export async function acceptInviteAction(
  _prevState: AcceptInviteFormState,
  formData: FormData,
): Promise<AcceptInviteFormState> {
  const rawPassword = formData.get("password");
  const parsed = inputSchema.safeParse({
    token: formData.get("token"),
    requiresPassword: formData.get("requiresPassword"),
    password: rawPassword ? String(rawPassword) : undefined,
    confirmPassword: formData.get("confirmPassword") ? String(formData.get("confirmPassword")) : undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the highlighted fields and try again.";
    return { status: "idle", error: message };
  }

  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null;
  const result = await acceptResidentInvite(parsed.data.token, passwordHash);

  if (!result) {
    return { status: "invalid" };
  }
  return { status: "success" };
}

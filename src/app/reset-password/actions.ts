"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { passwordSchema } from "@/server/auth/password";
import { resetPassword } from "@/server/auth/passwordReset/service";

const inputSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export interface ResetPasswordFormState {
  status: "idle" | "success" | "invalid";
  error?: string;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = inputSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the highlighted fields and try again.";
    return { status: "idle", error: message };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const result = await resetPassword(parsed.data.token, passwordHash);

  if (!result.ok) {
    return { status: "invalid" };
  }
  return { status: "success" };
}

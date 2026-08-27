"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { passwordSchema } from "@/server/auth/password";
import { changePassword } from "@/server/auth/passwordReset/service";
import { signOut } from "@/server/auth/config";
import { ForbiddenError } from "@/lib/errors";

const inputSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export interface ChangePasswordFormState {
  error?: string;
}

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const user = await requireUser();

  const parsed = inputSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the highlighted fields and try again.";
    return { error: message };
  }

  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  try {
    await changePassword(user.id, parsed.data.currentPassword, newPasswordHash);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: error.message };
    }
    return { error: "Something went wrong changing your password. Please try again." };
  }

  // The password just changed, which invalidates every session (including
  // this one — see the jwt callback in server/auth/config.ts) on its next
  // read. Signing out explicitly clears the cookie immediately rather than
  // leaving a session that will only fail on its *next* use.
  await signOut({ redirectTo: "/login?passwordChanged=1" });
  return {};
}

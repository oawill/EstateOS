"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth/config";

export interface LoginFormState {
  error?: string;
}

export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // Auth.js's successful signIn() throws a NEXT_REDIRECT signal — let it propagate.
    throw error;
  }
}

"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/server/db/client";
import { signIn } from "@/server/auth/config";
import { signupSchema } from "./schema";

export interface SignupFormState {
  error?: string;
}

export async function signupAction(_prevState: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid name, email, and a password of at least 8 characters." };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirectTo: "/onboarding/new-estate" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please try signing in." };
    }
    throw error;
  }
}

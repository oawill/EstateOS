import { z } from "zod";
import { passwordSchema } from "@/server/auth/password";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: passwordSchema,
});

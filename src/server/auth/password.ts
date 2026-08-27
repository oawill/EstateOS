import { z } from "zod";

// The single password policy for the whole app — signup, forgot/reset
// password and the authenticated change-password flow all import this, so
// there's never a mismatch between "what registration required" and "what
// reset will accept." 8 is a reasonable secure minimum without frustrating
// users with composition rules; 72 is bcrypt's own input limit.
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

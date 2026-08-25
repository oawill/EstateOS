import { notFound, redirect } from "next/navigation";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";

/**
 * Runs a page's data-loading/auth logic and translates our domain errors
 * into the right Next.js navigation outcome, so every page gets the same
 * behavior for "not signed in" / "not found or not yours" / "wrong role"
 * without repeating try/catch boilerplate.
 */
export async function guardPage<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/forbidden");
    throw error;
  }
}

import { cache } from "react";
import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db/client";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import type { Role } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string;
  isPlatformAdmin: boolean;
}

/**
 * Loads the full user row (not just the JWT claims) so `isPlatformAdmin`
 * and other server-truth fields are always fresh, not baked into a token
 * that could go stale for the life of a session.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export interface EstateMembership {
  estateId: string;
  estateSlug: string;
  estateName: string;
  role: Role;
}

/**
 * Resolves the caller's membership for the estate named in the URL.
 * The estate slug is just an opaque resource identifier here — the same
 * as any other id in a URL — and access is decided entirely by whether an
 * *active* EstateMember row exists for (user, estate), looked up fresh on
 * every call. A slug for an estate the user isn't a member of behaves
 * identically to a slug that doesn't exist (see NotFoundError).
 */
export async function requireEstateMember(estateSlug: string): Promise<{
  user: CurrentUser;
  membership: EstateMembership;
}> {
  const user = await requireUser();

  const estate = await prisma.estate.findUnique({ where: { slug: estateSlug } });
  if (!estate) throw new NotFoundError("Estate");

  const member = await prisma.estateMember.findFirst({
    where: { estateId: estate.id, userId: user.id, isActive: true },
  });
  if (!member) throw new NotFoundError("Estate");

  return {
    user,
    membership: {
      estateId: estate.id,
      estateSlug: estate.slug,
      estateName: estate.name,
      role: member.role,
    },
  };
}

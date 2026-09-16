import { prisma } from "@/server/db/client";

interface GuestIdentity {
  userId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  country?: string | null;
}

/** Never the long-term Tenant model — deduplicated by userId, then email, then phone, the same pattern as RentalApplicant in Tenant Management, so a repeat guest across many bookings gets one profile. */
export async function findOrCreateGuest(identity: GuestIdentity) {
  const email = identity.email?.trim() || null;
  const phone = identity.phone?.trim() || null;

  if (identity.userId) {
    const existing = await prisma.shortletGuest.findUnique({ where: { userId: identity.userId } });
    if (existing) return existing;
  }
  if (email) {
    const existing = await prisma.shortletGuest.findFirst({ where: { email } });
    if (existing) return existing;
  }
  if (phone) {
    const existing = await prisma.shortletGuest.findFirst({ where: { phone } });
    if (existing) return existing;
  }

  return prisma.shortletGuest.create({
    data: {
      userId: identity.userId || null,
      fullName: identity.fullName,
      email,
      phone,
      whatsapp: identity.whatsapp?.trim() || null,
      country: identity.country?.trim() || null,
    },
  });
}

export async function getGuestProfile(guestId: string) {
  return prisma.shortletGuest.findUnique({
    where: { id: guestId },
    include: { bookings: { include: { listing: true }, orderBy: { createdAt: "desc" } } },
  });
}

import { prisma } from "@/server/db/client";

interface ApplicantIdentity {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  whatsapp?: string | null;
}

/**
 * One base RentalApplicant profile per prospective tenant, reused across
 * every listing they inquire about or apply to — matched first by userId
 * (a signed-in applicant), then by email, then by phone, so the same
 * person applying to a second property never gets a duplicate profile.
 */
export async function findOrCreateApplicant(identity: ApplicantIdentity) {
  const email = identity.email?.trim() || null;
  const phone = identity.phone?.trim() || null;

  if (identity.userId) {
    const existing = await prisma.rentalApplicant.findUnique({ where: { userId: identity.userId } });
    if (existing) return existing;
  }
  if (email) {
    const existing = await prisma.rentalApplicant.findFirst({ where: { email } });
    if (existing) return existing;
  }
  if (phone) {
    const existing = await prisma.rentalApplicant.findFirst({ where: { phone } });
    if (existing) return existing;
  }

  return prisma.rentalApplicant.create({
    data: {
      userId: identity.userId || null,
      fullName: identity.fullName,
      email,
      phone,
      whatsapp: identity.whatsapp?.trim() || null,
    },
  });
}

export async function getApplicantProfile(applicantId: string) {
  return prisma.rentalApplicant.findUnique({
    where: { id: applicantId },
    include: {
      applications: { include: { listing: true }, orderBy: { createdAt: "desc" } },
      inquiries: { orderBy: { createdAt: "desc" } },
      viewings: { orderBy: { createdAt: "desc" } },
    },
  });
}

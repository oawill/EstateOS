import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL as string) });

const DEMO_PASSWORD = "password123";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD);

  // Platform super admin — not tied to any estate.
  await prisma.user.upsert({
    where: { email: "admin@estateos.ng" },
    update: {},
    create: {
      email: "admin@estateos.ng",
      name: "EstateOS Admin",
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  // -- Estate 1: Greenview Gardens ------------------------------------
  const greenviewAdmin = await prisma.user.upsert({
    where: { email: "admin@greenview.ng" },
    update: {},
    create: { email: "admin@greenview.ng", name: "Adaeze Okafor", passwordHash },
  });
  const greenviewFinance = await prisma.user.upsert({
    where: { email: "finance@greenview.ng" },
    update: {},
    create: { email: "finance@greenview.ng", name: "Chidi Nwosu", passwordHash },
  });
  const greenviewFacility = await prisma.user.upsert({
    where: { email: "facility@greenview.ng" },
    update: {},
    create: { email: "facility@greenview.ng", name: "Tunde Bakare", passwordHash },
  });
  const greenviewSecurity = await prisma.user.upsert({
    where: { email: "security@greenview.ng" },
    update: {},
    create: { email: "security@greenview.ng", name: "Musa Ibrahim", passwordHash },
  });
  const residentUser = await prisma.user.upsert({
    where: { email: "resident@greenview.ng" },
    update: {},
    create: { email: "resident@greenview.ng", name: "Adebayo Lawal", passwordHash },
  });
  const greenviewVendor = await prisma.user.upsert({
    where: { email: "vendor@greenview.ng" },
    update: {},
    create: { email: "vendor@greenview.ng", name: "Emeka Okoye", passwordHash },
  });

  const greenview = await prisma.estate.upsert({
    where: { slug: "greenview-gardens" },
    update: {},
    create: {
      name: "Greenview Gardens Estate",
      slug: "greenview-gardens",
      address: "12 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
      contactEmail: "office@greenview.ng",
      contactPhone: "08012345678",
      subscriptionStatus: "TRIAL",
    },
  });

  await prisma.estateMember.createMany({
    data: [
      { estateId: greenview.id, userId: greenviewAdmin.id, role: Role.ESTATE_ADMIN },
      { estateId: greenview.id, userId: greenviewFinance.id, role: Role.FINANCE },
      { estateId: greenview.id, userId: greenviewFacility.id, role: Role.FACILITY_MANAGER },
      { estateId: greenview.id, userId: greenviewSecurity.id, role: Role.SECURITY },
      { estateId: greenview.id, userId: residentUser.id, role: Role.RESIDENT },
      { estateId: greenview.id, userId: greenviewVendor.id, role: Role.VENDOR },
    ],
    skipDuplicates: true,
  });

  const alreadySeededProperties = await prisma.property.findFirst({ where: { estateId: greenview.id } });
  if (!alreadySeededProperties) {
    const block = await prisma.block.create({ data: { estateId: greenview.id, name: "Block A" } });

    const property = await prisma.property.create({
      data: {
        estateId: greenview.id,
        blockId: block.id,
        addressLabel: "Block A, House 4",
        propertyType: "DETACHED_HOUSE",
        units: { create: { estateId: greenview.id, label: "", occupancyStatus: "OCCUPIED" } },
      },
      include: { units: true },
    });

    const resident = await prisma.resident.create({
      data: {
        estateId: greenview.id,
        userId: residentUser.id,
        firstName: "Adebayo",
        lastName: "Lawal",
        email: residentUser.email,
        phone: "08023456789",
        emergencyContactName: "Funke Lawal",
        emergencyContactPhone: "08034567890",
      },
    });

    await prisma.occupancy.create({
      data: {
        unitId: property.units[0].id,
        residentId: resident.id,
        role: "OWNER",
        moveInDate: new Date("2023-01-15"),
      },
    });

    await prisma.vehicle.create({
      data: {
        estateId: greenview.id,
        residentId: resident.id,
        plateNumber: "LND-421-KJ",
        make: "Toyota",
        model: "Camry",
        color: "Black",
      },
    });
  }

  // -- Estate 2: Palm Court (isolation check) --------------------------
  const palmAdmin = await prisma.user.upsert({
    where: { email: "admin@palmcourt.ng" },
    update: {},
    create: { email: "admin@palmcourt.ng", name: "Ngozi Eze", passwordHash },
  });

  const palmCourt = await prisma.estate.upsert({
    where: { slug: "palm-court" },
    update: {},
    create: {
      name: "Palm Court Residences",
      slug: "palm-court",
      address: "5 Ademola Adetokunbo Crescent",
      city: "Abuja",
      state: "FCT",
      subscriptionStatus: "ACTIVE",
    },
  });

  await prisma.estateMember.createMany({
    data: [{ estateId: palmCourt.id, userId: palmAdmin.id, role: Role.ESTATE_ADMIN }],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log("Demo password for every seeded user:", DEMO_PASSWORD);
  console.log("Platform admin: admin@estateos.ng");
  console.log("Greenview Gardens admin: admin@greenview.ng (also finance/facility/security/resident/vendor @greenview.ng)");
  console.log("Palm Court admin (tenant isolation check): admin@palmcourt.ng");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

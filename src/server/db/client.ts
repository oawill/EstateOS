import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma 7 requires a driver adapter instead of a schema-level datasource
// url, which is what makes it straightforward to later point this at a
// different Postgres-compatible provider without touching the schema.
const adapter = new PrismaPg(process.env.DATABASE_URL as string);

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

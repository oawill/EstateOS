import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the datasource connection out of schema.prisma. This file
// is used by the Prisma CLI (migrate, studio, db seed) — the app's runtime
// PrismaClient gets its connection separately via a driver adapter, see
// src/server/db/client.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
    // Only needed if the DATABASE_URL role lacks CREATEDB — set this to a
    // pre-created empty database and Prisma will use it instead of trying
    // to create/drop a shadow database itself.
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

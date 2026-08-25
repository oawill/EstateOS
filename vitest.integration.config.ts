import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests hit the real dev database (DATABASE_URL from .env,
// loaded via `pnpm test:integration`'s dotenv-cli wrapper) — kept separate
// from the default, DB-free `vitest.config.ts` used by `pnpm test`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
  },
});

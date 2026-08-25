import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Integration tests hit the real dev database and need DATABASE_URL
    // loaded (see `pnpm test:integration`) — excluded from the default,
    // DB-free `pnpm test` run.
    exclude: ["node_modules/**", "**/*.integration.test.ts"],
  },
});

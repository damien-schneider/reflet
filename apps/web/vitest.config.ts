import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@app": path.resolve(import.meta.dirname, "./app"),
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_CONVEX_SITE_URL: "https://test.convex.site",
      NEXT_PUBLIC_CONVEX_URL: "https://test.convex.cloud",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-public-key",
    },
    environment: "jsdom",
    exclude: ["node_modules", ".next", "e2e"],
    include: ["src/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 20_000,
  },
});

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    glob: ["**/*.test.ts", "**/*.test.tsx"],
    environment: "jsdom",
    setupFiles: [],
    include: ["src/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

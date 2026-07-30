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
    coverage: {
      exclude: [
        "src/components/ui/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/types.ts",
        "src/**/types/**",
        "src/**/constants.ts",
        "src/**/constants/**",
        "src/**/*.stories.{ts,tsx}",
        "src/env.ts",
        "src/middleware.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
    },
    environment: "jsdom",
    exclude: ["node_modules", ".next", "e2e"],
    include: ["src/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

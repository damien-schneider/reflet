import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
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
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./app"),
    },
  },
});

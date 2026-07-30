import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

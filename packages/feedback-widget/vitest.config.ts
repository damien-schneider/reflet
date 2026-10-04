import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __API_URL__: JSON.stringify("https://api.reflet.test"),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});

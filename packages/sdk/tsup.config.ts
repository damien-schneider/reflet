import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
    server: "src/server.ts",
  },
  external: ["react"],
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
  treeshake: true,
});

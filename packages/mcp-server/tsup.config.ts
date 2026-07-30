import { defineConfig } from "tsup";

export default defineConfig({
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  dts: true,
  entry: { index: "src/index.ts" },
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
});

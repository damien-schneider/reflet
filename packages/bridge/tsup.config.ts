import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts", index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  noExternal: ["@reflet/harness"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  banner: { js: "#!/usr/bin/env node" },
});

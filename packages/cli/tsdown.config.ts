import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  // A directory copied with flatten keeps its own name under `to`: this lands in dist/live-window.
  copy: [{ from: "../sdk/dist/live-window", to: "dist" }],
  deps: { alwaysBundle: [/^reflet-sdk(\/|$)/] },
  dts: true,
  entry: { index: "src/index.ts" },
  format: ["esm"],
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  sourcemap: true,
  target: "es2022",
});

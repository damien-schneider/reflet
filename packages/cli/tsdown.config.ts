import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const liveShell = fileURLToPath(
  new URL("../live-shell/dist/reflet-live-shell", import.meta.url)
);

export default defineConfig({
  clean: true,
  copy: [
    // A directory copied with flatten keeps its own name under `to`: this lands in dist/live-window.
    { from: "../sdk/dist/live-window", to: "dist" },
    ...(existsSync(liveShell)
      ? [{ from: liveShell, to: "dist/live-shell" }]
      : []),
  ],
  deps: { alwaysBundle: [/^reflet-sdk(\/|$)/] },
  dts: true,
  entry: { index: "src/index.ts" },
  format: ["esm"],
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  sourcemap: true,
  target: "es2022",
});

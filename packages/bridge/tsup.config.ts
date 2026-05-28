import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

const bridgeDownloadDir = resolve(
  import.meta.dirname,
  "../../apps/web/public/downloads"
);
const bridgeTarballPath = resolve(bridgeDownloadDir, "reflet-bridge-0.1.0.tgz");

export default defineConfig({
  entry: { cli: "src/cli.ts", index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  noExternal: ["@reflet/harness", "zod"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  banner: { js: "#!/usr/bin/env node" },
  onSuccess() {
    mkdirSync(bridgeDownloadDir, { recursive: true });
    rmSync(bridgeTarballPath, { force: true });
    const pack = spawnSync(
      "npm",
      ["pack", "--pack-destination", bridgeDownloadDir],
      {
        cwd: import.meta.dirname,
        stdio: "inherit",
      }
    );
    if (pack.status !== 0) {
      throw new Error("Bridge tarball generation failed");
    }
  },
});

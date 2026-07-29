import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

const bridgeDownloadDir = resolve(
  import.meta.dirname,
  "../../apps/web/public/downloads"
);
const bridgeTarballPath = resolve(bridgeDownloadDir, "reflet-bridge-0.1.0.tgz");
const bridgeNpmCacheDir = resolve(tmpdir(), "reflet-npm-cache");

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
    mkdirSync(bridgeNpmCacheDir, { recursive: true });
    rmSync(bridgeTarballPath, { force: true });
    const pack = spawnSync(
      "npm",
      [
        "pack",
        // Skip lifecycle scripts so `npm pack` does not re-run prepublishOnly
        // (which runs this same build) and recurse into a broken tarball.
        "--ignore-scripts",
        "--cache",
        bridgeNpmCacheDir,
        "--pack-destination",
        bridgeDownloadDir,
      ],
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

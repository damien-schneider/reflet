import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BINARY = "reflet-live-shell";
const TARGETS = ["aarch64-apple-darwin", "x86_64-apple-darwin"];
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(packageRoot, "dist", BINARY);

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}`
    );
  }
}

if (process.platform === "darwin") {
  run("cargo", [
    "build",
    "--release",
    "--locked",
    ...TARGETS.flatMap((target) => ["--target", target]),
  ]);
  mkdirSync(dirname(output), { recursive: true });
  run("lipo", [
    "-create",
    "-output",
    output,
    ...TARGETS.map((target) =>
      join(packageRoot, "target", target, "release", BINARY)
    ),
  ]);
  run("codesign", ["--force", "--sign", "-", output]);
} else {
  process.stdout.write(
    `Skipping ${BINARY}: the Reflet Live shell only builds on macOS.\n`
  );
}

// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const packageJsonSchema = z.object({
  exports: z.record(z.string(), z.record(z.string(), z.string())),
  name: z.string(),
});

const packageJsonText = readFileSync(
  new URL("../../package.json", import.meta.url),
  "utf8"
);
const packageJson = packageJsonSchema.parse(JSON.parse(packageJsonText));

function installIntoTempConsumer(): string {
  const consumerDir = mkdtempSync(join(tmpdir(), "reflet-sdk-consumer-"));
  const packageDir = join(consumerDir, "node_modules", packageJson.name);
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(join(packageDir, "package.json"), packageJsonText);
  for (const conditions of Object.values(packageJson.exports)) {
    for (const target of Object.values(conditions)) {
      const targetPath = join(packageDir, target);
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, "");
    }
  }
  return consumerDir;
}

describe("package exports", () => {
  it("resolve every entry point for require-condition consumers such as next/dynamic under webpack", () => {
    const requireFromConsumer = createRequire(
      join(installIntoTempConsumer(), "index.js")
    );
    for (const subpath of Object.keys(packageJson.exports)) {
      const specifier = join(packageJson.name, subpath);
      expect(() => requireFromConsumer.resolve(specifier)).not.toThrow();
    }
  });
});

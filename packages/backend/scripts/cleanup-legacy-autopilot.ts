#!/usr/bin/env bun
/**
 * One-shot data migration after the coding-adapter strip.
 *
 * Run from packages/backend:
 *   bun run scripts/cleanup-legacy-autopilot.ts
 *
 * What it does:
 *   1. Patches convex/schema.ts to set { schemaValidation: false }.
 *   2. Pushes the relaxed schema with `convex dev --once`.
 *   3. Runs the cleanup mutation to strip legacy fields and rows.
 *   4. Reverts convex/schema.ts to strict validation.
 *   5. Pushes the strict schema again.
 *
 * Idempotent. Self-recovers if interrupted (always reverts schema in `finally`).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SCHEMA_PATH = resolve(import.meta.dirname, "..", "convex/schema.ts");
const STRICT_OPEN = "export default defineSchema({";
const RELAXED_OPEN = "export default defineSchema(\n  {";
const STRICT_CLOSE_RE = /\}\);\s*$/m;
const RELAXED_CLOSE = "  },\n  { schemaValidation: false }\n);";

function isAlreadyRelaxed(content: string): boolean {
  return content.includes("schemaValidation: false");
}

function patchSchemaToRelaxed(): void {
  const content = readFileSync(SCHEMA_PATH, "utf-8");
  if (isAlreadyRelaxed(content)) {
    return;
  }
  const opened = content.replace(STRICT_OPEN, RELAXED_OPEN);
  const closed = opened.replace(STRICT_CLOSE_RE, RELAXED_CLOSE);
  writeFileSync(SCHEMA_PATH, closed);
  console.log("• schema.ts → relaxed (schemaValidation: false)");
}

function revertSchemaToStrict(): void {
  const content = readFileSync(SCHEMA_PATH, "utf-8");
  if (!isAlreadyRelaxed(content)) {
    return;
  }
  const closed = content.replace(RELAXED_CLOSE, "});");
  const opened = closed.replace(RELAXED_OPEN, STRICT_OPEN);
  writeFileSync(SCHEMA_PATH, opened);
  console.log("• schema.ts → strict (validation restored)");
}

function run(cmd: string): void {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  patchSchemaToRelaxed();
  run("bunx convex dev --once");
  run("bunx convex run autopilot/migrations:cleanupLegacyAutopilotData '{}'");
} finally {
  revertSchemaToStrict();
}

run("bunx convex dev --once");
console.log("\n✓ Cleanup complete. Strict schema restored.");

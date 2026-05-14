#!/usr/bin/env npx tsx

/**
 * OpenRouter Model ID Verification
 *
 * Scans the autopilot model configuration files for OpenRouter model IDs
 * (e.g. "openai/gpt-5-mini", "anthropic/claude-sonnet-4.6"), then checks
 * each ID against the live OpenRouter catalog. Fails the build when any
 * ID is missing or renamed so we never ship a "model X is not a valid
 * model ID" error to users.
 *
 * Usage:
 *   bun run verify:models           # uses .env.local
 *   bun run verify:models:prod      # uses .env.production
 *
 * Required env vars:
 *   - OPENROUTER_API_KEY
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";

const isProductionMode = process.env.OPENROUTER_MODE === "production";
config({ path: isProductionMode ? ".env.production" : ".env.local" });

const SCAN_FILES = [
  "convex/autopilot/agents/models.ts",
  "convex/autopilot/agents/shared_generation.ts",
  "convex/autopilot/codebase/agent.ts",
  "convex/autopilot/codebase/actions.ts",
] as const;

// Matches strings like "provider/model" or "provider/model:variant".
// Excludes generic paths (must start with a lowercase provider slug, no spaces).
const MODEL_ID_RE = /"([a-z][a-z0-9._-]{1,40}\/[a-zA-Z0-9._:-]{1,80})"/g;
const PROVIDER_ALLOWLIST = new Set([
  "openai",
  "anthropic",
  "google",
  "meta-llama",
  "qwen",
  "mistralai",
  "nvidia",
  "minimax",
  "stepfun",
  "z-ai",
  "deepseek",
  "cohere",
  "perplexity",
  "x-ai",
]);

interface CodeRef {
  file: string;
  line: number;
  modelId: string;
}

async function fetchValidModelIds(apiKey: string): Promise<Set<string>> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(
      `OpenRouter /models returned ${response.status}: ${await response.text()}`
    );
  }
  const payload = (await response.json()) as { data: { id: string }[] };
  return new Set(payload.data.map((m) => m.id));
}

async function scanFile(relativePath: string): Promise<CodeRef[]> {
  const fullPath = resolve(process.cwd(), relativePath);
  const source = await readFile(fullPath, "utf8");
  const refs: CodeRef[] = [];
  const lines = source.split("\n");
  for (const [idx, line] of lines.entries()) {
    MODEL_ID_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop.
    while ((match = MODEL_ID_RE.exec(line)) !== null) {
      const modelId = match[1];
      const provider = modelId.split("/", 1)[0];
      if (!PROVIDER_ALLOWLIST.has(provider)) {
        continue;
      }
      refs.push({ file: relativePath, line: idx + 1, modelId });
    }
  }
  return refs;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local (or .env.production with --prod) and try again."
    );
    process.exit(1);
  }

  const validIds = await fetchValidModelIds(apiKey);
  console.log(`Fetched ${validIds.size} model IDs from OpenRouter`);

  const allRefs = (await Promise.all(SCAN_FILES.map(scanFile))).flat();
  const uniqueIds = [...new Set(allRefs.map((r) => r.modelId))].sort();
  console.log(`Found ${uniqueIds.length} unique model IDs across config files`);

  const invalidIds = uniqueIds.filter((id) => !validIds.has(id));
  if (invalidIds.length === 0) {
    console.log("All model IDs are valid on OpenRouter.");
    return;
  }

  console.error("\nInvalid model IDs detected:");
  for (const id of invalidIds) {
    const occurrences = allRefs.filter((r) => r.modelId === id);
    console.error(`  ${id}`);
    for (const occ of occurrences) {
      console.error(`    at ${occ.file}:${occ.line}`);
    }
  }
  console.error(
    "\nFix: pick a valid replacement from https://openrouter.ai/models or update the model registry."
  );
  process.exit(1);
}

main().catch((error) => {
  console.error("verify-openrouter-models failed:", error);
  process.exit(1);
});

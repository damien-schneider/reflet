/**
 * Adapter registry — resolves the correct coding adapter based on config.
 *
 * This is the single entry point the orchestrator uses. It never
 * imports individual adapters directly.
 */

import { builtinAdapter } from "./builtin";
import { claudeCodeAdapter } from "./claude_code";
import { codexAdapter } from "./codex";
import { copilotAdapter } from "./copilot";
import type { CodingAdapter } from "./types";

type AdapterName = "builtin" | "copilot" | "codex" | "claude_code";

const adapters: Record<AdapterName, CodingAdapter> = {
  builtin: builtinAdapter,
  copilot: copilotAdapter,
  codex: codexAdapter,
  claude_code: claudeCodeAdapter,
} as const;

/**
 * Get a coding adapter by name. Throws if unknown.
 */
export const getAdapter = (name: string): CodingAdapter => {
  const adapter = adapters[name as AdapterName];
  if (!adapter) {
    throw new Error(
      `Unknown adapter "${name}". Available: ${Object.keys(adapters).join(", ")}`
    );
  }
  return adapter;
};

/**
 * List all available adapters with their display info.
 */
export const listAdapters = (): Array<{
  name: string;
  displayName: string;
  requiredCredentials: string[];
}> =>
  Object.values(adapters).map((adapter) => ({
    name: adapter.name,
    displayName: adapter.displayName,
    requiredCredentials: adapter.requiredCredentials,
  }));

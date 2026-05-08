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

type AdapterName =
  | "builtin"
  | "copilot"
  | "codex"
  | "claude_code"
  | "open_swe"
  | "openclaw";

const createUnsupportedAdapter = (
  name: Extract<AdapterName, "open_swe" | "openclaw">,
  displayName: string
): CodingAdapter => {
  const errorMessage = `${displayName} is not configured for production execution. Select Codex, Claude Code, or Copilot before dispatching dev work.`;
  return {
    name,
    displayName: `${displayName} (not configured)`,
    requiredCredentials: [],
    executeTask: async () => ({
      status: "failed",
      activityLogs: [
        {
          agent: "dev",
          level: "error",
          message: errorMessage,
          timestamp: Date.now(),
        },
      ],
      tokensUsed: 0,
      estimatedCostUsd: 0,
      errorMessage,
    }),
    getStatus: async () => ({
      status: "failed",
      activityLogs: [
        {
          agent: "system",
          level: "error",
          message: errorMessage,
          timestamp: Date.now(),
        },
      ],
      tokensUsed: 0,
      estimatedCostUsd: 0,
    }),
    cancelTask: async () => undefined,
    validateCredentials: async () => false,
  };
};

const adapters: Record<AdapterName, CodingAdapter> = {
  builtin: builtinAdapter,
  copilot: copilotAdapter,
  codex: codexAdapter,
  claude_code: claudeCodeAdapter,
  open_swe: createUnsupportedAdapter("open_swe", "Open SWE"),
  openclaw: createUnsupportedAdapter("openclaw", "OpenClaw"),
};

function isAdapterName(name: string): name is AdapterName {
  return name in adapters;
}

/**
 * Get a coding adapter by name. Throws if unknown.
 */
export const getAdapter = (name: string): CodingAdapter => {
  if (!isAdapterName(name)) {
    throw new Error(
      `Unknown adapter "${name}". Available: ${Object.keys(adapters).join(", ")}`
    );
  }
  return adapters[name];
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

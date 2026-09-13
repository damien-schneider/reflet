import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULT_API_URL = "https://harmless-clam-802.convex.site";
export const CONFIG_PATH = join(homedir(), ".reflet", "config.json");

export interface StoredConfig {
  apiKey?: string;
  apiUrl?: string;
}

export function readStoredConfig(path = CONFIG_PATH): StoredConfig {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const apiKey = Reflect.get(parsed, "apiKey");
    const apiUrl = Reflect.get(parsed, "apiUrl");
    return {
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
      apiUrl: typeof apiUrl === "string" ? apiUrl : undefined,
    };
  } catch {
    return {};
  }
}

export function writeStoredConfig(
  config: StoredConfig,
  path = CONFIG_PATH
): void {
  mkdirSync(dirname(path), { mode: 0o700, recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
}

export function resolveApiKey(
  env: NodeJS.ProcessEnv = process.env,
  stored: StoredConfig = readStoredConfig()
): string {
  const apiKey = env.REFLET_API_KEY || stored.apiKey;
  if (!apiKey) {
    throw new Error(
      "No API key. Set REFLET_API_KEY or run `reflet login --api-key fb_sec_…`"
    );
  }
  return apiKey;
}

export function resolveApiUrl(
  env: NodeJS.ProcessEnv = process.env,
  stored: StoredConfig = readStoredConfig()
): string {
  return env.REFLET_API_URL || stored.apiUrl || DEFAULT_API_URL;
}

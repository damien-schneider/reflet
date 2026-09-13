import { hostname, userInfo } from "node:os";
import { parseArgs } from "node:util";
import { RefletAdminClient } from "../api/client";
import { resolveApiKey, resolveApiUrl } from "../config";
import { heading, indent, SYMBOL, style, table } from "../render";
import { CONTENT_COMMANDS } from "./admin-commands-content";
import { FEEDBACK_COMMANDS } from "./admin-commands-feedback";
import type { CommandSpec, Flags } from "./admin-flags";

const COMMANDS = { ...FEEDBACK_COMMANDS, ...CONTENT_COMMANDS };

export const ADMIN_RESOURCES = Object.keys(COMMANDS).sort();

function defaultClaimer(): string {
  return `${userInfo().username}@${hostname()}`;
}

function resourceHelp(resource: string): string {
  const actions = Object.entries(COMMANDS[resource] ?? {}).map(
    ([action, spec]) => {
      const flags = (spec.flags ?? []).map((flag) => `--${flag}`).join(" ");
      return `reflet ${resource} ${action} ${[spec.args, flags].filter(Boolean).join(" ")}`.trimEnd();
    }
  );
  return `${heading(resource)}\n${indent(actions.join("\n"))}\n${indent(style.dim("--json  print raw JSON (default when piped)"))}\n`;
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null)
  );
}

function formatResult(result: unknown): string {
  if (result === null || result === undefined) {
    return `${SYMBOL.tick} done`;
  }
  if (isRecordArray(result)) {
    return table(result);
  }
  if (
    typeof result === "object" &&
    "items" in result &&
    isRecordArray(result.items)
  ) {
    return table(result.items);
  }
  return JSON.stringify(result, null, 2);
}

function parseCommand(
  spec: CommandSpec,
  argv: string[]
): { flags: Flags; json: boolean; positional: string[] } {
  const options: Record<string, { type: "string" | "boolean" }> = {
    json: { type: "boolean" },
  };
  for (const flag of spec.flags ?? []) {
    options[flag] = { type: "string" };
  }
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: argv,
    options,
  });
  const flags: Flags = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      flags[key] = value;
    }
  }
  if (flags.as === undefined && (spec.flags ?? []).includes("as")) {
    flags.as = defaultClaimer();
  }
  return { flags, json: values.json === true, positional: positionals };
}

export async function runAdmin(argv: string[]): Promise<number> {
  const [resource = "", action, ...rest] = argv;
  const resourceCommands = COMMANDS[resource];
  if (!resourceCommands) {
    process.stderr.write(`${SYMBOL.cross} Unknown resource: ${resource}\n`);
    return 1;
  }
  const spec = action ? resourceCommands[action] : undefined;
  if (!spec || rest.includes("--help")) {
    process.stdout.write(resourceHelp(resource));
    return spec ? 0 : 1;
  }

  const { flags, json, positional } = parseCommand(spec, rest);
  const client = new RefletAdminClient({
    baseUrl: resolveApiUrl(),
    secretKey: resolveApiKey(),
  });
  const result = await spec.run(client, positional, flags);
  const asJson = json || process.stdout.isTTY !== true;
  process.stdout.write(
    `${asJson ? JSON.stringify(result, null, 2) : formatResult(result)}\n`
  );
  return 0;
}

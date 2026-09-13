import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { RefletAdminClient } from "../api/client";
import {
  CONFIG_PATH,
  readStoredConfig,
  resolveApiUrl,
  writeStoredConfig,
} from "../config";
import { SYMBOL, style } from "../render";

async function askForSecretKey(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `${SYMBOL.info} Secret key from Reflet dashboard → Settings → Agents & CLI ${style.dim("(fb_sec_…)")}: `
    );
    return answer.trim();
  } finally {
    rl.close();
  }
}

export async function runLogin(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "api-key": { type: "string" },
      "api-url": { type: "string" },
    },
  });

  const apiKey =
    values["api-key"] ??
    (process.stdin.isTTY === true ? await askForSecretKey() : "");
  if (!apiKey) {
    process.stderr.write(
      `${SYMBOL.cross} Pass --api-key fb_sec_… (no TTY to prompt)\n`
    );
    return 1;
  }

  const apiUrl = values["api-url"] ?? resolveApiUrl();
  const client = new RefletAdminClient({ baseUrl: apiUrl, secretKey: apiKey });
  const organization = await client.getOrganization();
  if (!organization) {
    process.stderr.write(`${SYMBOL.cross} Key rejected by ${apiUrl}\n`);
    return 1;
  }

  writeStoredConfig({
    ...readStoredConfig(),
    apiKey,
    apiUrl: values["api-url"],
  });
  process.stdout.write(
    `${SYMBOL.tick} Logged in to ${style.bold(organization.name)} ${style.dim(`(${CONFIG_PATH})`)}\n`
  );
  return 0;
}

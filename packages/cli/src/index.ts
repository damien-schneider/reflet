#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { runDoctor } from "./commands/doctor";
import { type InitReport, runInit, SDK_PACKAGE } from "./commands/init";
import { nodeFileSystem, type PackageManager } from "./project";
import { heading, indent, SYMBOL, style } from "./render";
import { SETUP_PROMPT } from "./setup-prompt";

const VERSION = "0.1.0";

const INSTALL_COMMAND: Record<PackageManager, string[]> = {
  bun: ["add"],
  npm: ["install"],
  pnpm: ["add"],
  yarn: ["add"],
};

const HELP = `${style.bold("reflet")} — add the Reflet feedback widget to a React app

${style.bold("Usage")}
  reflet init [options]     install the SDK and mount the widget
  reflet doctor             check an existing setup
  reflet prompt             print the setup prompt for a coding agent

${style.bold("Options for init")}
  --public-key <key>        your fb_pub_… key from the Reflet dashboard
  --position <corner>       bottom-right (default), bottom-left, top-right, top-left
  --dry-run                 show what would change without writing
  --skip-install            do not run the package manager
  --yes                     never prompt, use defaults
  --cwd <dir>               project root (defaults to the current directory)

${style.bold("Examples")}
  npx reflet-cli init
  npx reflet-cli init --public-key fb_pub_abc --yes
  npx reflet-cli doctor`;

function install(manager: PackageManager): void {
  const args = [...INSTALL_COMMAND[manager], SDK_PACKAGE];
  process.stdout.write(
    `${SYMBOL.info} ${style.dim(`${manager} ${args.join(" ")}`)}\n`
  );

  const result = spawnSync(manager, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(
      `${manager} ${args.join(" ")} failed — install ${SDK_PACKAGE} yourself and rerun with --skip-install`
    );
  }
}

async function askForKey(): Promise<string | undefined> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `${SYMBOL.info} Public key from your Reflet dashboard ${style.dim("(fb_pub_…, leave empty to fill in later)")}: `
    );
    return answer.trim() || undefined;
  } finally {
    rl.close();
  }
}

function reportChanges(report: InitReport, dryRun: boolean): void {
  process.stdout.write(heading(dryRun ? "Would change" : "Changed"));
  process.stdout.write("\n");

  for (const change of report.changes) {
    const symbol = change.status === "skipped" ? SYMBOL.warn : SYMBOL.tick;
    const note = change.note ? style.dim(` — ${change.note}`) : "";
    process.stdout.write(
      indent(`${symbol} ${change.path} ${style.dim(change.status)}${note}\n`)
    );
  }

  const skipped = report.changes.some((change) => change.status === "skipped");
  if (skipped) {
    process.stdout.write(heading("Add this yourself"));
    process.stdout.write(`\n${indent(report.snippet)}\n`);
  }

  const needsKey = report.changes.some(
    (change) => change.note === "fill in your public key"
  );

  process.stdout.write(heading("Next"));
  process.stdout.write(
    `\n${indent(
      [
        needsKey
          ? `Set ${style.cyan(report.envKey)} to your fb_pub_… key (Reflet dashboard → Settings → API Keys & Widget).`
          : null,
        "Start the app and click the floating button.",
        `Stuck? ${style.cyan("npx reflet-cli doctor")}`,
      ]
        .filter(Boolean)
        .join("\n")
    )}\n\n`
  );
}

async function commandInit(values: {
  cwd?: string;
  "dry-run"?: boolean;
  position?: string;
  "public-key"?: string;
  "skip-install"?: boolean;
  yes?: boolean;
}): Promise<number> {
  const dryRun = values["dry-run"] === true;
  const interactive =
    !(values.yes || values["public-key"] || dryRun) &&
    process.stdin.isTTY === true;

  const publicKey =
    values["public-key"] ?? (interactive ? await askForKey() : undefined);

  const report = runInit({
    cwd: values.cwd ?? process.cwd(),
    dryRun,
    files: nodeFileSystem,
    install,
    position: values.position,
    publicKey,
    skipInstall: values["skip-install"] === true,
  });

  reportChanges(report, dryRun);
  return 0;
}

function commandDoctor(cwd: string): number {
  const { checks, ok } = runDoctor(nodeFileSystem, cwd);

  process.stdout.write(heading("Reflet setup"));
  process.stdout.write("\n");
  for (const check of checks) {
    const symbol = check.ok ? SYMBOL.tick : SYMBOL.cross;
    const hint = check.ok || !check.hint ? "" : style.dim(` — ${check.hint}`);
    process.stdout.write(indent(`${symbol} ${check.label}${hint}\n`));
  }
  process.stdout.write("\n");

  return ok ? 0 : 1;
}

export async function run(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      cwd: { type: "string" },
      "dry-run": { type: "boolean" },
      help: { short: "h", type: "boolean" },
      position: { type: "string" },
      "public-key": { type: "string" },
      "skip-install": { type: "boolean" },
      version: { short: "v", type: "boolean" },
      yes: { short: "y", type: "boolean" },
    },
  });

  if (values.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const command = positionals[0];

  if (values.help || !command) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  switch (command) {
    case "init":
      return await commandInit(values);
    case "doctor":
      return commandDoctor(values.cwd ?? process.cwd());
    case "prompt":
      process.stdout.write(`${SETUP_PROMPT}\n`);
      return 0;
    default:
      process.stderr.write(
        `${SYMBOL.cross} Unknown command: ${command}\n${HELP}\n`
      );
      return 1;
  }
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(
    `${SYMBOL.cross} ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
}

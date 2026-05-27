import { createBridgeApiClient } from "./runtime/api";
import { parseBridgeCommand } from "./runtime/command";
import { runDoctor } from "./runtime/doctor";
import { runBridgeLoop, runBridgeOnce } from "./runtime/runner";

function printDoctor(repoPath: string): void {
  const report = runDoctor(repoPath);
  process.stdout.write(
    report.checks
      .map((check) => `${check.label}: ${check.passed ? "ok" : "missing"}`)
      .join("\n")
  );
  process.stdout.write("\n");
  if (!report.ready) {
    process.exitCode = 1;
  }
}

function requireValue(value: string | null | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

const command = parseBridgeCommand(process.argv.slice(2));
if (command.kind === "doctor") {
  printDoctor(".");
} else {
  const secretKey = requireValue(
    process.env.REFLET_SECRET_KEY,
    "REFLET_SECRET_KEY"
  );
  const siteUrl = requireValue(command.siteUrl, "--site-url");
  const repoFullName = requireValue(command.repoFullName, "--repo-full-name");
  const api = createBridgeApiClient({ secretKey, siteUrl });
  if (command.kind === "run-once") {
    await runBridgeOnce({
      api,
      bridgeName: "Reflet Bridge",
      repoFullName,
      repoPath: command.repoPath,
    });
  } else {
    process.stdout.write(`Reflet Bridge watching ${command.repoPath}\n`);
    await runBridgeLoop({
      api,
      bridgeName: "Reflet Bridge",
      intervalMs: command.intervalMs,
      repoFullName,
      repoPath: command.repoPath,
    });
  }
}

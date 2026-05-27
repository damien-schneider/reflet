import { spawnSync } from "node:child_process";
import { parseBridgeCommand } from "./index";

function commandSucceeds(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}

function printDoctor(): void {
  const report = {
    git: commandSucceeds("git", ["--version"]),
    repo: commandSucceeds("git", ["rev-parse", "--is-inside-work-tree"]),
    claude: commandSucceeds("claude", ["--version"]),
  };
  process.stdout.write(
    [
      `Git CLI: ${report.git ? "ok" : "missing"}`,
      `Git repository: ${report.repo ? "ok" : "missing"}`,
      `Claude Code: ${report.claude ? "ok" : "missing"}`,
    ].join("\n")
  );
  process.stdout.write("\n");
  if (!(report.git && report.repo && report.claude)) {
    process.exitCode = 1;
  }
}

const command = parseBridgeCommand(process.argv.slice(2));
if (command.kind === "doctor") {
  printDoctor();
} else {
  process.stdout.write(`Reflet Bridge watching ${command.repoPath}\n`);
}

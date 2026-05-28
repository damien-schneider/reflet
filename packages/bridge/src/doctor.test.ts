import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDoctorReport, runDoctor } from "./runtime/doctor";

function runGit(args: string[]): void {
  execFileSync("git", args, { stdio: "ignore" });
}

async function writeExecutable(path: string, lines: string[]): Promise<void> {
  await writeFile(path, lines.join("\n"));
  await chmod(path, 0o755);
}

describe("Bridge doctor", () => {
  it("accepts local git excludes and verifies remote push access with dry-run", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-doctor-"));
    const bin = join(root, "bin");
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    try {
      await mkdir(bin, { recursive: true });
      await writeExecutable(join(bin, "claude"), [
        "#!/bin/sh",
        'if [ "$1" = "auth" ]; then exit 0; fi',
        "exit 1",
      ]);
      await writeExecutable(join(bin, "gh"), [
        "#!/bin/sh",
        'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
        'if [ "$1" = "auth" ]; then exit 0; fi',
        "exit 1",
      ]);
      runGit(["init", "--bare", remote]);
      runGit(["init", repo]);
      runGit(["-C", repo, "config", "user.email", "bridge@example.com"]);
      runGit(["-C", repo, "config", "user.name", "Reflet Bridge"]);
      await writeFile(join(repo, "README.md"), "Reflet test repo\n");
      await writeFile(
        join(repo, ".git", "info", "exclude"),
        ".reflet.local/\n"
      );
      runGit(["-C", repo, "add", "README.md"]);
      runGit(["-C", repo, "commit", "-m", "init"]);
      runGit(["-C", repo, "remote", "add", "origin", remote]);

      expect(
        runDoctor(repo, { PATH: `${bin}:${process.env.PATH ?? ""}` })
      ).toEqual({
        checks: [
          { label: "Git CLI", passed: true },
          { label: "Git repository", passed: true },
          { label: "Git remote push", passed: true },
          { label: "Claude Code", passed: true },
          { label: "GitHub CLI", passed: true },
          { label: "GitHub auth", passed: true },
          { label: ".reflet.local ignored", passed: true },
          { label: ".reflet secrets clean", passed: true },
        ],
        claudeCodeAvailable: true,
        ready: true,
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("keeps Claude availability separate from full doctor readiness", () => {
    expect(
      createDoctorReport({
        claudeCodeAvailable: true,
        ghAuthenticated: false,
        ghAvailable: true,
        gitAvailable: true,
        insideGitRepo: true,
        refletLocalIgnored: true,
        refletSecretsClean: true,
        remotePushAvailable: true,
      })
    ).toMatchObject({
      claudeCodeAvailable: true,
      ready: false,
    });
  });
});

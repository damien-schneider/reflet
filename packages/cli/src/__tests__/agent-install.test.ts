import { describe, expect, it } from "vitest";
import { SKILL_DESCRIPTION } from "../agent-prompt";
import { runAgentInstall } from "../commands/agent-install";
import type { FileSystemPort } from "../project";

function workspace(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const files: FileSystemPort = {
    exists: (path) => store.has(path),
    read: (path) => store.get(path) ?? null,
    write: (path, content) => {
      store.set(path, content);
    },
  };
  return { files, store };
}

const SKILL_PATHS = [
  "/app/.agents/skills/reflet/SKILL.md",
  "/app/.claude/skills/reflet/SKILL.md",
  "/app/.omp/skills/reflet/SKILL.md",
];

describe("agent install", () => {
  it("writes a loadable skill where every harness looks for it", () => {
    const { files, store } = workspace();

    runAgentInstall({ cwd: "/app", dryRun: false, files });

    for (const path of SKILL_PATHS) {
      const document = store.get(path) ?? "";
      const [, frontmatter = ""] = document.split("---\n");
      const description = frontmatter
        .split("\n")
        .find((line) => line.startsWith("description: "))
        ?.slice("description: ".length);
      expect(frontmatter).toContain("name: reflet\n");
      expect(JSON.parse(description ?? "")).toBe(SKILL_DESCRIPTION);
      expect(document).toContain("feedback claim-next");
    }
    expect(store.get("/app/.claude/commands/reflet.md")).toContain(
      "$ARGUMENTS"
    );
  });

  it("reports unchanged on a second run", () => {
    const { files } = workspace();

    runAgentInstall({ cwd: "/app", dryRun: false, files });
    const second = runAgentInstall({ cwd: "/app", dryRun: false, files });

    expect(second.filter(({ status }) => status !== "unchanged")).toEqual([
      { note: "add .reflet/ yourself", path: ".gitignore", status: "skipped" },
    ]);
  });

  it("keeps downloaded screenshots out of git", () => {
    const { files, store } = workspace({ "/app/.gitignore": "node_modules\n" });

    runAgentInstall({ cwd: "/app", dryRun: false, files });

    expect(store.get("/app/.gitignore")).toBe("node_modules\n.reflet/\n");
  });

  it("writes nothing on a dry run", () => {
    const { files, store } = workspace();

    const changes = runAgentInstall({ cwd: "/app", dryRun: true, files });

    expect(changes.every(({ status }) => status !== "unchanged")).toBe(true);
    expect(store.size).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { SKILL_DESCRIPTION } from "../agent-prompt";
import { runAgentInstall } from "../commands/agent-install";
import { LIVE_SKILL_DESCRIPTION } from "../live/live-prompt";
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

const SKILLS = [
  {
    command: "feedback claim-next",
    description: SKILL_DESCRIPTION,
    name: "reflet",
  },
  {
    command: "session watch",
    description: LIVE_SKILL_DESCRIPTION,
    name: "reflet-live",
  },
];

describe("agent install", () => {
  it.each(SKILLS)(
    "writes a loadable $name skill where every harness looks for it",
    ({ command, description, name }) => {
      const { files, store } = workspace();

      runAgentInstall({ cwd: "/app", dryRun: false, files });

      for (const root of [".agents/skills", ".claude/skills"]) {
        const document = store.get(`/app/${root}/${name}/SKILL.md`) ?? "";
        const [, frontmatter = ""] = document.split("---\n");
        const declared = frontmatter
          .split("\n")
          .find((line) => line.startsWith("description: "))
          ?.slice("description: ".length);
        expect(frontmatter).toContain(`name: ${name}\n`);
        expect(JSON.parse(declared ?? "")).toBe(description);
        expect(document).toContain(command);
      }
      expect(store.get(`/app/.claude/commands/${name}.md`)).toContain(
        "$ARGUMENTS"
      );
    }
  );

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

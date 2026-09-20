import { AGENT_PROMPT, SKILL_DESCRIPTION, SKILL_NAME } from "../agent-prompt";
import type { FileSystemPort } from "../project";
import type { InitChange } from "./init";
import { SCREENSHOT_DIRECTORY } from "./screenshot-download";

/** Every harness reads `SKILL.md`; only the directory it scans differs. */
const SKILL_DIRECTORIES = [".agents/skills", ".claude/skills"];
const SLASH_COMMAND_FILE = ".claude/commands/reflet.md";
const IGNORE_FILE = ".gitignore";
const IGNORE_ENTRY = `${SCREENSHOT_DIRECTORY.split("/")[0]}/`;

export interface AgentInstallInput {
  cwd: string;
  dryRun: boolean;
  files: FileSystemPort;
}

const SKILL_DOCUMENT = `---
name: ${SKILL_NAME}
description: ${JSON.stringify(SKILL_DESCRIPTION)}
---

# Reflet feedback queue

${AGENT_PROMPT}
`;

const SLASH_COMMAND_DOCUMENT = `---
description: Work the Reflet feedback queue end to end.
---

${AGENT_PROMPT}

Scope for this run — a feedback id works only that item, empty works the whole
queue: $ARGUMENTS
`;

function writeDocument(
  input: AgentInstallInput,
  relativePath: string,
  content: string
): InitChange {
  const path = `${input.cwd}/${relativePath}`;
  const existing = input.files.read(path);
  if (existing === content) {
    return { path: relativePath, status: "unchanged" };
  }
  if (!input.dryRun) {
    input.files.write(path, content);
  }
  return {
    path: relativePath,
    status: existing === null ? "created" : "updated",
  };
}

function ignoreScreenshots(input: AgentInstallInput): InitChange {
  const path = `${input.cwd}/${IGNORE_FILE}`;
  const existing = input.files.read(path);
  if (existing === null) {
    return {
      note: `add ${IGNORE_ENTRY} yourself`,
      path: IGNORE_FILE,
      status: "skipped",
    };
  }
  if (existing.split("\n").some((line) => line.trim() === IGNORE_ENTRY)) {
    return { path: IGNORE_FILE, status: "unchanged" };
  }
  const next = `${existing.endsWith("\n") ? existing : `${existing}\n`}${IGNORE_ENTRY}\n`;
  if (!input.dryRun) {
    input.files.write(path, next);
  }
  return {
    note: "downloaded screenshots stay out of git",
    path: IGNORE_FILE,
    status: "updated",
  };
}

/**
 * Drops the feedback workflow where agents look for skills — `.agents/skills`
 * for Codex and omp, `.claude/skills` for Claude Code — so the loop runs
 * without the user copying a prompt around.
 */
export function runAgentInstall(input: AgentInstallInput): InitChange[] {
  return [
    ...SKILL_DIRECTORIES.map((directory) =>
      writeDocument(
        input,
        `${directory}/${SKILL_NAME}/SKILL.md`,
        SKILL_DOCUMENT
      )
    ),
    writeDocument(input, SLASH_COMMAND_FILE, SLASH_COMMAND_DOCUMENT),
    ignoreScreenshots(input),
  ];
}

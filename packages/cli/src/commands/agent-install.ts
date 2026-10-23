import { AGENT_PROMPT, SKILL_DESCRIPTION, SKILL_NAME } from "../agent-prompt";
import {
  LIVE_AGENT_PROMPT,
  LIVE_SKILL_DESCRIPTION,
  LIVE_SKILL_NAME,
} from "../live/live-prompt";
import type { FileSystemPort } from "../project";
import type { InitChange } from "./init";
import { SCREENSHOT_DIRECTORY } from "./screenshot-download";

/** Every harness reads `SKILL.md`; only the directory it scans differs. */
const SKILL_DIRECTORIES = [".agents/skills", ".claude/skills"];
const SLASH_COMMAND_DIRECTORY = ".claude/commands";
const IGNORE_FILE = ".gitignore";
const IGNORE_ENTRY = `${SCREENSHOT_DIRECTORY.split("/")[0]}/`;

export interface AgentInstallInput {
  cwd: string;
  dryRun: boolean;
  files: FileSystemPort;
}

interface AgentWorkflow {
  argumentsLine: string;
  commandDescription: string;
  name: string;
  prompt: string;
  skillDescription: string;
  title: string;
}

const WORKFLOWS: AgentWorkflow[] = [
  {
    argumentsLine:
      "Scope for this run — a feedback id works only that item, empty works the whole\nqueue: $ARGUMENTS",
    commandDescription: "Work the Reflet feedback queue end to end.",
    name: SKILL_NAME,
    prompt: AGENT_PROMPT,
    skillDescription: SKILL_DESCRIPTION,
    title: "Reflet feedback queue",
  },
  {
    argumentsLine:
      "Dev server for this run — its address, empty for the default above:\n$ARGUMENTS",
    commandDescription:
      "Follow the Reflet session I am recording and fix what I point out.",
    name: LIVE_SKILL_NAME,
    prompt: LIVE_AGENT_PROMPT,
    skillDescription: LIVE_SKILL_DESCRIPTION,
    title: "Reflet live session",
  },
];

const skillDocument = (workflow: AgentWorkflow): string => `---
name: ${workflow.name}
description: ${JSON.stringify(workflow.skillDescription)}
---

# ${workflow.title}

${workflow.prompt}
`;

const slashCommandDocument = (workflow: AgentWorkflow): string => `---
description: ${workflow.commandDescription}
---

${workflow.prompt}

${workflow.argumentsLine}
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
 * Drops the workflows where agents look for skills — `.agents/skills` for
 * Codex and omp, `.claude/skills` for Claude Code — so they run without the
 * user copying a prompt around.
 */
export function runAgentInstall(input: AgentInstallInput): InitChange[] {
  return [
    ...WORKFLOWS.flatMap((workflow) => [
      ...SKILL_DIRECTORIES.map((directory) =>
        writeDocument(
          input,
          `${directory}/${workflow.name}/SKILL.md`,
          skillDocument(workflow)
        )
      ),
      writeDocument(
        input,
        `${SLASH_COMMAND_DIRECTORY}/${workflow.name}.md`,
        slashCommandDocument(workflow)
      ),
    ]),
    ignoreScreenshots(input),
  ];
}

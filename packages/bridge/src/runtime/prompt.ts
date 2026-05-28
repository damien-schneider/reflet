import { createHash } from "node:crypto";
import type { HarnessRecipe } from "@reflet/harness";

export interface ClaudeCommandInput {
  jobId: string;
  prompt: string;
  recipe: HarnessRecipe;
}

export interface ClaudeCommand {
  args: string[];
  command: "claude";
}

function allowedTools(recipe: HarnessRecipe): string {
  const tools = new Set([
    ...recipe.allowedTools,
    "Write",
    "Bash(git *)",
    "Bash(gh pr *)",
    "Bash(mkdir *)",
  ]);
  return [...tools].join(",");
}

function buildOutputContract(recipe: HarnessRecipe): string {
  return recipe.outputs
    .map((output) =>
      [
        `File: ${output.path}`,
        `# ${recipe.title}`,
        "",
        "## Summary",
        "- Write the durable product knowledge for this recipe.",
        "",
        "## Evidence",
        "- Source: <repo path or URL>; Claim: <specific claim supported by that source>.",
        "- Assumption: <only when no direct source exists>.",
      ].join("\n")
    )
    .join("\n\n");
}

export function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildClaudeRecipePrompt(recipe: HarnessRecipe): string {
  const outputs = recipe.outputs
    .map((output) => `- ${output.artifactKind}: ${output.path}`)
    .join("\n");
  const subagents = recipe.subagents
    .map((subagent) => `- ${subagent}`)
    .join("\n");
  const validations = recipe.validations
    .map((validation) => `- ${validation}`)
    .join("\n");

  return [
    "You are running the Reflet repo-native product harness.",
    "Use the ProductMap TASK model: Topics, Agents, Skills, Knowledge.",
    `Topic: ${recipe.productMapTopic}`,
    `Lifecycle: ${recipe.productMapLifecycle}`,
    "",
    "Required subagents:",
    subagents,
    "",
    "Required outputs:",
    outputs,
    "",
    "Validators:",
    validations,
    "",
    "Output contract:",
    "For every required output, write the exact file path and include this markdown structure:",
    buildOutputContract(recipe),
    "",
    "Do not finish until every required output has a visible `## Evidence` heading.",
    "Before committing, verify each required output with `grep -n '^## Evidence' <path>`.",
    "",
    "Write all durable product knowledge under .reflet/.",
    "Never create a users folder inside .reflet. Audience research belongs in .reflet/audience and .reflet/user-research.",
    "Keep secrets in .reflet.local only. Never write tokens, emails, or private user data into .reflet/.",
    "Commit the .reflet changes, push the current branch, and open a draft PR with gh pr create --draft.",
    "Do not merge, publish, email, contact leads, post online, or modify production analytics.",
  ].join("\n");
}

export function buildClaudeCommand({
  jobId,
  prompt,
  recipe,
}: ClaudeCommandInput): ClaudeCommand {
  return {
    command: "claude",
    args: [
      "--print",
      "--output-format",
      "json",
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      allowedTools(recipe),
      "--append-system-prompt",
      `Reflet job id: ${jobId}. Return a concise JSON result when done.`,
      prompt,
    ],
  };
}

export function parseClaudeSessionId(output: string): string | null {
  try {
    const parsed: unknown = JSON.parse(output);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "session_id" in parsed &&
      typeof parsed.session_id === "string"
    ) {
      return parsed.session_id;
    }
  } catch {
    return null;
  }
  return null;
}

import { createHash } from "node:crypto";
import type { HarnessRecipe } from "@reflet/harness";
import { resolveRecipeSink } from "@reflet/harness";

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
    "Bash(curl *)",
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

function buildDocumentsSinkContract(recipe: HarnessRecipe): string[] {
  const outputPath = recipe.outputs[0]?.path ?? ".reflet/out/documents.json";
  return [
    "Output contract:",
    `Write a single machine-readable JSON file at ${outputPath}.`,
    'It must contain an object with a `documents` array: { "documents": [ { "type", "title", "targetUrl", "content", "platform" } ] }.',
    '`type` must be a valid document type (for Reddit replies use "reddit_reply"). `platform` describes the source (e.g. "reddit").',
    "`targetUrl` must be the canonical URL of the real thread the reply targets.",
    "",
    "For Reddit discovery, the JSON endpoints are blocked. Use the RSS endpoints via curl instead:",
    "- New posts: curl -s https://www.reddit.com/r/<subreddit>/new.rss",
    "- Search: curl -s 'https://www.reddit.com/r/<subreddit>/search.rss?q=<query>&restrict_sr=1&sort=new'",
    "- Verify a thread exists and read its body by appending .rss to its permalink and curling it.",
    "Only include a document if you VERIFIED the target thread currently exists by curling its .rss.",
    "Each document's `content` must reference the source thread URL so evidence is traceable.",
    "Draft helpful, specific, non-spammy replies; mention the product only where it genuinely fits.",
    "",
    "Do NOT push, open a PR, post, email, contact leads, or modify production analytics.",
    "Reflet reviews these drafts before anything is published.",
  ];
}

function buildKnowledgeOutputContract(recipe: HarnessRecipe): string[] {
  return [
    "Output contract:",
    "For every required output, write the exact file path and include this markdown structure:",
    buildOutputContract(recipe),
    "",
    "Do not finish until every required output has a visible `## Evidence` heading.",
    "Before writing the final files, verify each required output with `grep -n '^## Evidence' <path>`.",
    "",
    "Write all durable product knowledge under .reflet/.",
    "Never create a users folder inside .reflet. Audience research belongs in .reflet/audience and .reflet/user-research.",
    "Keep secrets in .reflet.local only. Never write tokens, emails, or private user data into .reflet/.",
  ];
}

function buildPrSinkContract(recipe: HarnessRecipe): string[] {
  return [
    ...buildKnowledgeOutputContract(recipe),
    "Commit the .reflet changes, push the current branch, and open a draft PR with gh pr create --draft.",
    "Do not merge, publish, email, contact leads, post online, or modify production analytics.",
  ];
}

function buildArtifactsSinkContract(recipe: HarnessRecipe): string[] {
  return [
    ...buildKnowledgeOutputContract(recipe),
    "This is a knowledge recipe. Just write the .reflet files — that is the whole job.",
    "Do NOT push, do NOT open a PR, do NOT run git commit, gh, or any publish/email step.",
    "Reflet harvests the .reflet file contents directly; no git PR is created.",
    "Do not merge, publish, email, contact leads, post online, or modify production analytics.",
  ];
}

function buildSinkContract(
  recipe: HarnessRecipe,
  sink: ReturnType<typeof resolveRecipeSink>
): string[] {
  if (sink === "documents") {
    return buildDocumentsSinkContract(recipe);
  }
  if (sink === "artifacts") {
    return buildArtifactsSinkContract(recipe);
  }
  return buildPrSinkContract(recipe);
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
  const sink = resolveRecipeSink(recipe);
  const sinkContract = buildSinkContract(recipe, sink);

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
    ...sinkContract,
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

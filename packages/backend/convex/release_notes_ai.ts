"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { action } from "./_generated/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_COMMITS_FOR_CONTEXT = 100;
const MAX_FILES_FOR_CONTEXT = 50;

/**
 * Generate release notes from commit data using AI
 * Pro feature: takes commits + file changes and produces polished markdown release notes
 */
export const generateReleaseNotes = action({
  args: {
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.optional(v.string()),
        author: v.string(),
      })
    ),
    files: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          status: v.string(),
          additions: v.number(),
          deletions: v.number(),
        })
      )
    ),
    version: v.optional(v.string()),
    previousVersion: v.optional(v.string()),
    repositoryName: v.optional(v.string()),
    additionalContext: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const commitSummary = args.commits
      .slice(0, MAX_COMMITS_FOR_CONTEXT)
      .map((c) => `- ${c.message} (${c.sha} by @${c.author})`)
      .join("\n");

    const fileSummary = args.files
      ? args.files
          .slice(0, MAX_FILES_FOR_CONTEXT)
          .map(
            (f) =>
              `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`
          )
          .join("\n")
      : "No file change data available";

    const versionInfo = args.version
      ? `Version: ${args.version}${args.previousVersion ? ` (from ${args.previousVersion})` : ""}`
      : "";

    const repoInfo = args.repositoryName
      ? `Repository: ${args.repositoryName}`
      : "";

    const prompt = `Generate professional, user-facing release notes in Markdown from the following git changes.

${versionInfo}
${repoInfo}

## Commits
${commitSummary}

## Files Changed
${fileSummary}

${args.additionalContext ? `## Additional Context\n${args.additionalContext}` : ""}

## Instructions
- Group changes into categories like **Features**, **Bug Fixes**, **Improvements**, **Breaking Changes** (only include categories that have items)
- Write from the user's perspective — explain what changed and why it matters, not the implementation details
- Use clear, concise bullet points
- Do NOT include commit SHAs, author names, or file paths unless they add context
- Do NOT add a title/heading — just the categorized content
- Skip merge commits, dependency bumps, and trivial changes unless they affect users
- If there are breaking changes, highlight them clearly
- Keep a professional but approachable tone
- Output only the markdown content, nothing else`;

    const result = await generateText({
      model: openrouter("anthropic/claude-sonnet-4"),
      prompt,
    });

    return result.text;
  },
});

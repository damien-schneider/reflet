/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

// Constants mirroring release_notes_ai.ts
const MAX_COMMITS_FOR_CONTEXT = 100;
const MAX_FILES_FOR_CONTEXT = 50;
const BREAKING_CHANGES_RE =
  /breaking changes.*highlight|highlight.*breaking changes/i;

interface Commit {
  sha: string;
  message: string;
  fullMessage?: string;
  author: string;
}

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

// Replicate exact prompt construction logic from release_notes_ai.ts handler
function buildPrompt(args: {
  commits: Commit[];
  files?: FileChange[];
  version?: string;
  previousVersion?: string;
  repositoryName?: string;
  additionalContext?: string;
}): string {
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

  return `Generate professional, user-facing release notes in Markdown from the following git changes.

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
}

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    sha: "abc1234",
    message: "fix: resolve login issue",
    author: "devuser",
    ...overrides,
  };
}

function makeFile(overrides: Partial<FileChange> = {}): FileChange {
  return {
    filename: "src/index.ts",
    status: "modified",
    additions: 10,
    deletions: 3,
    ...overrides,
  };
}

describe("release notes AI prompt construction", () => {
  describe("commit formatting", () => {
    test("should limit commits to MAX_COMMITS_FOR_CONTEXT", () => {
      const commits = Array.from({ length: 150 }, (_, i) =>
        makeCommit({ sha: `sha${i}`, message: `commit ${i}` })
      );
      const prompt = buildPrompt({ commits });

      const commitLines = prompt
        .split("\n")
        .filter((line) => line.startsWith("- ") && line.includes(" by @"));
      expect(commitLines).toHaveLength(MAX_COMMITS_FOR_CONTEXT);
    });

    test("should include sha and author in commit format", () => {
      const commit = makeCommit({
        sha: "deadbeef",
        message: "feat: add button",
        author: "janedoe",
      });
      const prompt = buildPrompt({ commits: [commit] });

      expect(prompt).toContain("feat: add button (deadbeef by @janedoe)");
    });

    test("should handle empty commit message", () => {
      const commit = makeCommit({ message: "" });
      const prompt = buildPrompt({ commits: [commit] });

      expect(prompt).toContain("(abc1234 by @devuser)");
    });

    test("should include very long commit messages as-is", () => {
      const longMessage = `feat: ${"a".repeat(500)}`;
      const commit = makeCommit({ message: longMessage });
      const prompt = buildPrompt({ commits: [commit] });

      expect(prompt).toContain(longMessage);
    });

    test("should handle author names with special characters", () => {
      const commit = makeCommit({ author: "user@company" });
      const prompt = buildPrompt({ commits: [commit] });

      expect(prompt).toContain("@user@company");
    });
  });

  describe("file formatting", () => {
    test("should limit files to MAX_FILES_FOR_CONTEXT", () => {
      const files = Array.from({ length: 80 }, (_, i) =>
        makeFile({ filename: `file${i}.ts` })
      );
      const prompt = buildPrompt({ commits: [makeCommit()], files });

      const fileLines = prompt
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("- ") && line.includes("+") && line.includes("/-")
        );
      expect(fileLines).toHaveLength(MAX_FILES_FOR_CONTEXT);
    });

    test("should include additions and deletions in file format", () => {
      const file = makeFile({
        filename: "lib/utils.ts",
        status: "modified",
        additions: 25,
        deletions: 7,
      });
      const prompt = buildPrompt({ commits: [makeCommit()], files: [file] });

      expect(prompt).toContain("lib/utils.ts (modified: +25/-7)");
    });

    test("should handle files with zero additions and deletions", () => {
      const file = makeFile({
        filename: "README.md",
        status: "renamed",
        additions: 0,
        deletions: 0,
      });
      const prompt = buildPrompt({ commits: [makeCommit()], files: [file] });

      expect(prompt).toContain("README.md (renamed: +0/-0)");
    });

    test("should show no file data when files are not provided", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("No file change data available");
    });

    test("should produce empty file section when files array is empty", () => {
      // An empty array is truthy in JS, so the ternary produces an empty join("")
      const prompt = buildPrompt({ commits: [makeCommit()], files: [] });
      expect(prompt).not.toContain("No file change data available");
      expect(prompt).toContain("## Files Changed");
    });
  });

  describe("version and context info", () => {
    test("should include version info when version is provided", () => {
      const prompt = buildPrompt({
        commits: [makeCommit()],
        version: "v2.0.0",
      });

      expect(prompt).toContain("Version: v2.0.0");
    });

    test("should include previous version in parentheses", () => {
      const prompt = buildPrompt({
        commits: [makeCommit()],
        version: "v2.0.0",
        previousVersion: "v1.9.0",
      });

      expect(prompt).toContain("Version: v2.0.0 (from v1.9.0)");
    });

    test("should not include version line when version is not provided", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).not.toContain("Version:");
    });

    test("should include repository name when provided", () => {
      const prompt = buildPrompt({
        commits: [makeCommit()],
        repositoryName: "acme/widget",
      });

      expect(prompt).toContain("Repository: acme/widget");
    });

    test("should include additional context when provided", () => {
      const prompt = buildPrompt({
        commits: [makeCommit()],
        additionalContext: "This is a major refactor of the auth system.",
      });

      expect(prompt).toContain("This is a major refactor of the auth system.");
    });

    test("should handle version without v prefix", () => {
      const prompt = buildPrompt({
        commits: [makeCommit()],
        version: "2.0.0",
      });

      expect(prompt).toContain("Version: 2.0.0");
    });

    test("should handle missing all optional fields", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });

      expect(prompt).not.toContain("Version:");
      expect(prompt).not.toContain("Repository:");
      expect(prompt).not.toContain("Additional Context");
    });
  });

  describe("instruction quality", () => {
    test("should mention grouping into categories", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });

      expect(prompt).toContain("**Features**");
      expect(prompt).toContain("**Bug Fixes**");
      expect(prompt).toContain("**Improvements**");
      expect(prompt).toContain("**Breaking Changes**");
    });

    test("should mention user perspective", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("user's perspective");
    });

    test("should instruct NOT to include commit SHAs in output", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("Do NOT include commit SHAs");
    });

    test("should instruct to skip merge commits", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("Skip merge commits");
    });

    test("should instruct to highlight breaking changes", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toMatch(BREAKING_CHANGES_RE);
    });

    test("should instruct not to add title/heading", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("Do NOT add a title/heading");
    });

    test("should instruct to output only markdown", () => {
      const prompt = buildPrompt({ commits: [makeCommit()] });
      expect(prompt).toContain("Output only the markdown content");
    });
  });
});

import type {
  ReleaseCommit,
  ReleaseFile,
  ReleasePullRequest,
} from "../tableFields";

const MAX_COMMIT_BODY_LENGTH = 500;

export interface ReleaseNotesPromptInput {
  commits: ReleaseCommit[];
  files?: ReleaseFile[];
  maintainerNotes?: string;
  pullRequests?: ReleasePullRequest[];
  repositoryName?: string;
  totalCommits?: number;
  version?: string;
}

export const formatCommitLine = (commit: ReleaseCommit): string => {
  const body = commit.fullMessage
    .slice(commit.message.length)
    .trim()
    .slice(0, MAX_COMMIT_BODY_LENGTH);
  const header = `- ${commit.message} (${commit.sha.slice(0, 7)} by @${commit.author})`;
  return body ? `${header}\n  ${body.replaceAll("\n", "\n  ")}` : header;
};

export const buildReleaseNotesPrompt = (
  input: ReleaseNotesPromptInput
): string => {
  const {
    commits,
    files,
    maintainerNotes,
    pullRequests,
    repositoryName,
    totalCommits,
    version,
  } = input;
  const truncationNote =
    totalCommits && totalCommits > commits.length
      ? `\n(Showing the ${commits.length} newest of ${totalCommits} commits.)`
      : "";
  const sections = [
    "Generate professional, user-facing release notes in Markdown from the following git changes.",
    [
      version ? `Version: ${version}` : "",
      repositoryName ? `Repository: ${repositoryName}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    maintainerNotes
      ? `## Maintainer Release Notes (authoritative; written by the release tooling)\n${maintainerNotes}`
      : "",
    pullRequests && pullRequests.length > 0
      ? `## Pull Requests\n${pullRequests
          .map(
            (pullRequest) =>
              `- #${pullRequest.number} ${pullRequest.title}${pullRequest.body ? `\n  ${pullRequest.body.replaceAll("\n", "\n  ")}` : ""}`
          )
          .join("\n")}`
      : "",
    `## Commits${truncationNote}\n${commits.map(formatCommitLine).join("\n") || "No commits."}`,
    files && files.length > 0
      ? `## Files Changed\n${files
          .map(
            (file) =>
              `- ${file.filename} (${file.status}: +${file.additions}/-${file.deletions})`
          )
          .join("\n")}`
      : "",
    `## Instructions
- Group changes into categories like **Features**, **Bug Fixes**, **Improvements**, **Breaking Changes** (only include categories that have items)
- When maintainer release notes are present, treat them as the source of truth and use commits and pull requests only to add user-facing detail
- Write from the user's perspective — explain what changed and why it matters, not the implementation details
- Use clear, concise bullet points
- Do NOT include commit SHAs, author names, or file paths unless they add context
- Do NOT add a title/heading — just the categorized content
- Skip merge commits, dependency bumps, and trivial changes unless they affect users
- If there are breaking changes (including BREAKING CHANGE footers), highlight them clearly
- Keep a professional but approachable tone
- Output only the markdown content, nothing else`,
  ];
  return sections.filter(Boolean).join("\n\n");
};

export const buildReleaseTitlePrompt = ({
  description,
  version,
}: {
  description: string;
  version?: string;
}): string => `Generate a short, catchy release title (3-8 words) for the following release notes.
${version ? `Version: ${version}` : ""}

Release notes:
${description}

Instructions:
- Output ONLY the title text, nothing else
- Do not include the version number in the title
- Make it descriptive of the main theme of the release
- Keep it concise and engaging
- Do not use quotes around the title`;

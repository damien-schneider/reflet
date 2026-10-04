import type {
  ReleaseCommit,
  ReleaseFile,
  ReleasePullRequest,
} from "../tableFields";

const MAX_COMMIT_BODY_LENGTH = 500;
const MAX_FEEDBACK_DESCRIPTION_LENGTH = 200;

export interface ReleaseNotesPromptInput {
  commits: ReleaseCommit[];
  files?: ReleaseFile[];
  maintainerNotes?: string;
  pullRequests?: ReleasePullRequest[];
  repositoryName?: string;
  totalCommits?: number;
  version?: string;
}

export interface FeedbackCandidate {
  description?: string;
  id: string;
  status: string;
  title: string;
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

export const buildFeedbackMatchPrompt = ({
  commits,
  description,
  feedbackItems,
}: {
  commits: ReleaseCommit[];
  description: string;
  feedbackItems: FeedbackCandidate[];
}): string => {
  const commitSummary = commits.map(formatCommitLine).join("\n");
  const feedbackSummary = feedbackItems
    .map(
      (feedback) =>
        `[${feedback.id}] "${feedback.title}"${feedback.description ? ` — ${feedback.description.slice(0, MAX_FEEDBACK_DESCRIPTION_LENGTH)}` : ""} (status: ${feedback.status})`
    )
    .join("\n");

  return `You are analyzing a software release to find which user feedback items were addressed by this release.

## Release Notes
${description}

## Commits in this Release
${commitSummary || "No commit data available — match based on release notes only."}

## Candidate Feedback Items
${feedbackSummary}

## Task
Identify which feedback items are likely addressed, fixed, or resolved by the changes in this release.
Match based on semantic similarity between:
- The feedback title/description and the release notes content
- The feedback title/description and the commit messages

Be generous with matching — include items that are even partially related or tangentially addressed.
Use "high" confidence for clearly addressed items, "medium" for likely related, and "low" for possibly related.

For each match, respond ONLY with a valid JSON object (no markdown, no code fences) in this exact format:
{"matches": [{"feedbackId": "<exact ID from brackets>", "confidence": "high|medium|low", "reason": "<max 15 words>"}]}

Sort results by confidence (high first, then medium, then low).`;
};

import type { SyncDirection, WizardConfig } from "../wizard-config";

interface PromptOptions {
  appUrl: string;
  config: WizardConfig;
  defaultBranch: string;
  orgSlug: string;
  repoFullName: string;
}

export function generateAutoReleaseWorkflowYaml(
  branch: string,
  versionPrefix: string
): string {
  const tagPrefix = versionPrefix || "";
  return `name: Release Please

on:
  push:
    branches:
      - ${branch}

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node${tagPrefix ? `\n          include-v-in-tag: ${tagPrefix === "v" ? "true" : "false"}` : ""}
`;
}

function versioningLine(config: WizardConfig): string {
  return config.autoVersioning
    ? `enabled (SemVer, prefix: "${config.versionPrefix}", default increment: ${config.versionIncrement})`
    : "disabled";
}

function syncContext(options: PromptOptions): string {
  return `- Reflet (${options.appUrl}) is our changelog and release management tool
- Organization slug: "${options.orgSlug}"
- Release events reach Reflet through the Reflet GitHub App webhook, already installed on this repository — no workflow file, token or secret is needed for sync`;
}

export function generateAiPrompt(options: PromptOptions): string {
  if (options.config.workflow === "automated") {
    return generateAutomatedAiPrompt(options);
  }

  if (options.config.workflow === "manual") {
    return generateManualAiPrompt(options);
  }

  const { repoFullName, config } = options;

  return `No repository changes are needed for "${repoFullName}".

## Context

${syncContext(options)}
- Workflow: AI-Powered Release Notes — Reflet fetches commits since the last release tag and generates release notes using AI
- Auto-versioning: ${versioningLine(config)}
- When you create a release in Reflet, it will automatically push a GitHub Release${config.pushToGithubOnPublish ? "" : " (currently disabled)"}

Write your releases in Reflet — nothing to commit here.`;
}

function generateAutomatedAiPrompt(options: PromptOptions): string {
  const { repoFullName, defaultBranch, config } = options;

  const releasePleaseYaml = generateAutoReleaseWorkflowYaml(
    defaultBranch,
    config.versionPrefix
  );

  return `Set up automated releases with conventional commits for the repository "${repoFullName}".

## What to do

1. Create the file \`.github/workflows/release-please.yml\` with the following content:

\`\`\`yaml
${releasePleaseYaml}\`\`\`

2. Commit and push it to the "${defaultBranch}" branch.

## Conventional Commits

This setup uses release-please which requires conventional commit messages:

- \`feat: description\` — triggers a minor version bump
- \`fix: description\` — triggers a patch version bump
- \`chore: description\` — no version bump
- \`feat!: description\` or \`BREAKING CHANGE:\` in the body — triggers a major version bump

## Context

${syncContext(options)}
- Workflow: Automated Releases — release-please opens release PRs from conventional commits, and Reflet imports the published GitHub Release
- Version prefix: "${config.versionPrefix}"

## Important

- release-please uses GitHub Actions' built-in token ($GITHUB_TOKEN) — no additional tokens or secrets needed
- This works with both public and private repositories`;
}

function generateManualAiPrompt(options: PromptOptions): string {
  const { repoFullName, config } = options;

  if (!config.manualSyncEnabled) {
    return `No GitHub setup needed for the repository "${repoFullName}".

## Context

- Reflet (${options.appUrl}) is our changelog and release management tool
- Organization slug: "${options.orgSlug}"
- Workflow: Manual — releases are managed entirely in Reflet without GitHub sync
- Auto-versioning: ${versioningLine(config)}

You can enable GitHub sync later in Settings → Releases.`;
  }

  return `No repository changes are needed for "${repoFullName}".

## Context

${syncContext(options)}
- Workflow: Manual with sync — ${getSyncDescription(config.manualSyncDirection)}
- Auto-versioning: ${versioningLine(config)}
- When a GitHub Release is published, edited or deleted, the Reflet GitHub App delivers the event so Reflet stays in sync

Write your releases in Reflet or on GitHub — nothing to commit here.`;
}

function getSyncDescription(direction: SyncDirection): string {
  switch (direction) {
    case "github_first":
      return "GitHub → Reflet (GitHub releases are imported into Reflet for enrichment)";
    case "reflet_first":
      return "Reflet → GitHub (Releases written in Reflet are pushed to GitHub)";
    case "bidirectional":
      return "Bidirectional (both directions are synced)";
    case "none":
      return "No sync";
    default:
      return "Manual sync";
  }
}

import type { WizardConfig } from "../release-setup-wizard";

/**
 * Generate the GitHub Action workflow YAML for release sync
 */
export function generateWorkflowYaml(
  webhookUrl: string,
  branch: string
): string {
  return `name: Reflet Release Sync

on:
  release:
    types: [published, edited, deleted]
  push:
    branches:
      - ${branch}
    paths:
      - 'CHANGELOG.md'

jobs:
  notify-reflet:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Reflet of release
        if: github.event_name == 'release'
        run: |
          curl -X POST "${webhookUrl}" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: release" \\
            -d '{
              "action": "\${{ github.event.action }}",
              "release": {
                "id": "\${{ github.event.release.id }}",
                "tag_name": "\${{ github.event.release.tag_name }}",
                "name": "\${{ github.event.release.name }}",
                "body": "\${{ github.event.release.body }}",
                "html_url": "\${{ github.event.release.html_url }}",
                "draft": \${{ github.event.release.draft }},
                "prerelease": \${{ github.event.release.prerelease }},
                "published_at": "\${{ github.event.release.published_at }}",
                "created_at": "\${{ github.event.release.created_at }}"
              },
              "repository": {
                "full_name": "\${{ github.repository }}"
              },
              "installation": {
                "id": 0
              }
            }'

      - name: Notify Reflet of changelog update
        if: github.event_name == 'push'
        run: |
          curl -X POST "${webhookUrl}" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: push" \\
            -d '{
              "ref": "\${{ github.ref }}",
              "repository": {
                "full_name": "\${{ github.repository }}"
              }
            }'
`;
}

/**
 * Generate the release-please GitHub Action workflow YAML for automated releases
 */
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

/**
 * Generate a combined workflow YAML for automated releases (sync + release-please)
 */
export function generateCombinedWorkflowYaml(
  webhookUrl: string,
  branch: string,
  versionPrefix: string
): string {
  const syncYaml = generateWorkflowYaml(webhookUrl, branch);
  const releasePleaseYaml = generateAutoReleaseWorkflowYaml(
    branch,
    versionPrefix
  );

  return `# File 1: .github/workflows/reflet-release-sync.yml
${syncYaml}
---
# File 2: .github/workflows/release-please.yml
${releasePleaseYaml}`;
}

/**
 * Generate an AI-agent-friendly prompt for setting up the release sync
 */
export function generateAiPrompt(options: {
  repoFullName: string;
  defaultBranch: string;
  webhookUrl: string;
  workflowYaml: string;
  config: WizardConfig;
  orgSlug: string;
}): string {
  const { repoFullName, defaultBranch, config, orgSlug } = options;

  if (config.workflow === "automated") {
    return generateAutomatedAiPrompt(options);
  }

  if (config.workflow === "manual") {
    return generateManualAiPrompt(options);
  }

  // AI-powered workflow (default)
  return `Set up Reflet AI-powered release notes for the repository "${repoFullName}".

## What to do

1. Create the file \`.github/workflows/reflet-release-sync.yml\` with the following content:

\`\`\`yaml
${options.workflowYaml}\`\`\`

2. Commit and push this file to the "${defaultBranch}" branch.

## Context

- Reflet (${options.webhookUrl.replace("/api/github/webhook", "")}) is our changelog and release management tool
- Organization slug: "${orgSlug}"
- Workflow: AI-Powered Release Notes — Reflet fetches commits since the last release tag and generates release notes using AI
- Auto-versioning: ${config.autoVersioning ? `enabled (SemVer, prefix: "${config.versionPrefix}", default increment: ${config.versionIncrement})` : "disabled"}
- When you create a release in Reflet, it will automatically push a GitHub Release${config.pushToGithubOnPublish ? "" : " (currently disabled)"}

## Important

- This workflow uses GitHub Actions' built-in token ($GITHUB_TOKEN) which is automatically available in every workflow run — you do NOT need to create, generate, or configure any token or secret
- This works with both public and private repositories
- The webhook URL is already configured to accept events from this repository
- Do NOT modify the webhook URL or the JSON payload structure`;
}

function generateAutomatedAiPrompt(options: {
  repoFullName: string;
  defaultBranch: string;
  webhookUrl: string;
  workflowYaml: string;
  config: WizardConfig;
  orgSlug: string;
}): string {
  const { repoFullName, defaultBranch, config, orgSlug } = options;

  const releasePleaseYaml = generateAutoReleaseWorkflowYaml(
    defaultBranch,
    config.versionPrefix
  );

  return `Set up automated releases with conventional commits for the repository "${repoFullName}".

## What to do

1. Create the file \`.github/workflows/reflet-release-sync.yml\` with the following content:

\`\`\`yaml
${options.workflowYaml}\`\`\`

2. Create the file \`.github/workflows/release-please.yml\` with the following content:

\`\`\`yaml
${releasePleaseYaml}\`\`\`

3. Commit and push both files to the "${defaultBranch}" branch.

## Conventional Commits

This setup uses release-please which requires conventional commit messages:

- \`feat: description\` — triggers a minor version bump
- \`fix: description\` — triggers a patch version bump
- \`chore: description\` — no version bump
- \`feat!: description\` or \`BREAKING CHANGE:\` in the body — triggers a major version bump

## Context

- Reflet (${options.webhookUrl.replace("/api/github/webhook", "")}) is our changelog and release management tool
- Organization slug: "${orgSlug}"
- Workflow: Automated Releases — release-please creates release PRs from conventional commits, and Reflet syncs them
- Version prefix: "${config.versionPrefix}"
- When a release is published on GitHub, the sync workflow notifies Reflet to import it

## Important

- Both workflows use GitHub Actions' built-in token ($GITHUB_TOKEN) — no additional tokens or secrets needed
- This works with both public and private repositories
- The webhook URL is already configured to accept events from this repository
- Do NOT modify the webhook URL or the JSON payload structure`;
}

function generateManualAiPrompt(options: {
  repoFullName: string;
  defaultBranch: string;
  webhookUrl: string;
  workflowYaml: string;
  config: WizardConfig;
  orgSlug: string;
}): string {
  const { repoFullName, defaultBranch, config, orgSlug } = options;

  if (!config.manualSyncEnabled) {
    return `No GitHub setup needed for the repository "${repoFullName}".

## Context

- Reflet (${options.webhookUrl.replace("/api/github/webhook", "")}) is our changelog and release management tool
- Organization slug: "${orgSlug}"
- Workflow: Manual — releases are managed entirely in Reflet without GitHub sync
- Auto-versioning: ${config.autoVersioning ? `enabled (SemVer, prefix: "${config.versionPrefix}", default increment: ${config.versionIncrement})` : "disabled"}

You can enable GitHub sync later in Settings → Releases.`;
  }

  const syncDescription = getSyncDescription(config.manualSyncDirection);

  return `Set up Reflet release sync for the repository "${repoFullName}".

## What to do

1. Create the file \`.github/workflows/reflet-release-sync.yml\` with the following content:

\`\`\`yaml
${options.workflowYaml}\`\`\`

2. Commit and push this file to the "${defaultBranch}" branch.

## Context

- Reflet (${options.webhookUrl.replace("/api/github/webhook", "")}) is our changelog and release management tool
- Organization slug: "${orgSlug}"
- Workflow: Manual with sync — ${syncDescription}
- Auto-versioning: ${config.autoVersioning ? `enabled (SemVer, prefix: "${config.versionPrefix}", default increment: ${config.versionIncrement})` : "disabled"}
- When a GitHub Release is published, edited, or deleted, this workflow sends the event to Reflet so it stays in sync

## Important

- This workflow uses GitHub Actions' built-in token ($GITHUB_TOKEN) which is automatically available in every workflow run — you do NOT need to create, generate, or configure any token or secret
- This works with both public and private repositories
- The webhook URL is already configured to accept events from this repository
- Do NOT modify the webhook URL or the JSON payload structure`;
}

function getSyncDescription(direction: WizardConfig["syncDirection"]): string {
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

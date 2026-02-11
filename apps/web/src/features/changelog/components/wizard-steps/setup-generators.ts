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

  const syncDescription = getSyncDescription(config.syncDirection);

  return `Set up Reflet release sync for the repository "${repoFullName}".

## What to do

1. Create the file \`.github/workflows/reflet-release-sync.yml\` with the following content:

\`\`\`yaml
${options.workflowYaml}\`\`\`

2. Commit and push this file to the "${defaultBranch}" branch.

## Context

- Reflet (${options.webhookUrl.replace("/api/github/webhook", "")}) is our changelog and release management tool
- Organization slug: "${orgSlug}"
- Sync direction: ${syncDescription}
- Auto-versioning: ${config.autoVersioning ? `enabled (SemVer, prefix: "${config.versionPrefix}", default increment: ${config.versionIncrement})` : "disabled"}
- When a GitHub Release is published, edited, or deleted, this workflow sends the event to Reflet so it stays in sync

## Important

- This workflow uses GitHub Actions' built-in token ($GITHUB_TOKEN) which is automatically available in every workflow run — you do NOT need to create, generate, or configure any token or secret
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

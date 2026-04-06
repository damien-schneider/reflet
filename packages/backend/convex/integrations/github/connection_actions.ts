import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { action } from "../../_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

/**
 * Generate GitHub Action workflow content for auto-release
 */
export const generateWorkflowContent = action({
  args: {
    organizationSlug: v.string(),
    webhookUrl: v.string(),
    branch: v.string(),
  },
  handler: (_ctx, args) => {
    const workflowContent = `name: Reflet Release Sync

on:
  release:
    types: [published, edited, deleted]
  push:
    branches:
      - ${args.branch}
    paths:
      - 'CHANGELOG.md'

jobs:
  notify-reflet:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Reflet of release
        if: github.event_name == 'release'
        run: |
          curl -X POST "${args.webhookUrl}" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: release" \\
            -d '{
              "action": "${"$"}{{ github.event.action }}",
              "release": {
                "id": "${"$"}{{ github.event.release.id }}",
                "tag_name": "${"$"}{{ github.event.release.tag_name }}",
                "name": "${"$"}{{ github.event.release.name }}",
                "body": "${"$"}{{ github.event.release.body }}",
                "html_url": "${"$"}{{ github.event.release.html_url }}",
                "draft": ${"$"}{{ github.event.release.draft }},
                "prerelease": ${"$"}{{ github.event.release.prerelease }},
                "published_at": "${"$"}{{ github.event.release.published_at }}",
                "created_at": "${"$"}{{ github.event.release.created_at }}"
              },
              "repository": {
                "full_name": "${"$"}{{ github.repository }}"
              }
            }'

      - name: Notify Reflet of changelog update
        if: github.event_name == 'push'
        run: |
          curl -X POST "${args.webhookUrl}" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: push" \\
            -d '{
              "ref": "${"$"}{{ github.ref }}",
              "repository": {
                "full_name": "${"$"}{{ github.repository }}"
              }
            }'
`;

    return workflowContent;
  },
});

/**
 * Get GitHub connection from API routes
 * Called from Next.js API routes that need to access connection data
 * This action doesn't require user auth - API routes should verify session separately
 */
export const getConnectionFromApiRoute = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Doc<"githubConnections"> | null> => {
    return await ctx.runQuery(
      internal.integrations.github.queries.getConnectionInternal,
      {
        organizationId: args.organizationId,
      }
    );
  },
});

/**
 * Save user-level GitHub App installation from OAuth callback
 * Called from Next.js API route after validating with GitHub's API
 * Creates a userGithubConnections row for the user
 */
export const saveInstallationFromCallback = action({
  args: {
    userId: v.string(),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<Id<"userGithubConnections">> => {
    const userConnectionId = await ctx.runMutation(
      internal.integrations.github.installation_mutations.saveUserInstallation,
      {
        userId: args.userId,
        installationId: args.installationId,
        accountType: args.accountType,
        accountLogin: args.accountLogin,
        accountAvatarUrl: args.accountAvatarUrl,
      }
    );

    // Link to org if organizationId was provided
    if (args.organizationId) {
      await ctx.runMutation(
        internal.integrations.github.installation_mutations.linkRepoToOrg,
        {
          organizationId: args.organizationId,
          userGithubConnectionId: userConnectionId,
          linkedByUserId: args.userId,
        }
      );
    }

    return userConnectionId;
  },
});

/**
 * Create a webhook on a GitHub repository
 */
export const createWebhook = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    webhookUrl: v.string(),
    secret: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["release"],
          config: {
            url: args.webhookUrl,
            content_type: "json",
            secret: args.secret,
            insecure_ssl: "0",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create webhook: ${response.statusText} - ${errorText}`
      );
    }

    const webhook = (await response.json()) as { id: number };
    return { webhookId: String(webhook.id) };
  },
});

/**
 * Delete a webhook from a GitHub repository
 */
export const deleteWebhook = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    webhookId: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks/${args.webhookId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }

    return { success: true };
  },
});

/**
 * Update webhook to include issues events
 */
export const updateWebhookEvents = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    webhookId: v.string(),
    events: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks/${args.webhookId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: args.events,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update webhook: ${response.statusText} - ${errorText}`
      );
    }

    return { success: true };
  },
});

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";

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
 * Fetch repositories from GitHub installation
 */
export const fetchRepositories = action({
  args: {
    installationToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/installation/repositories`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      repositories: Array<{
        id: number;
        full_name: string;
        name: string;
        default_branch: string;
        private: boolean;
        description: string | null;
      }>;
    };

    return data.repositories.map((repo) => ({
      id: String(repo.id),
      fullName: repo.full_name,
      name: repo.name,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      description: repo.description,
    }));
  },
});

/**
 * Fetch releases from a GitHub repository
 */
export const fetchReleases = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/releases`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }

    const releases = (await response.json()) as Array<{
      id: number;
      tag_name: string;
      name: string | null;
      body: string | null;
      html_url: string;
      draft: boolean;
      prerelease: boolean;
      published_at: string | null;
      created_at: string;
    }>;

    return releases.map((release) => ({
      githubReleaseId: String(release.id),
      tagName: release.tag_name,
      name: release.name ?? undefined,
      body: release.body ?? undefined,
      htmlUrl: release.html_url,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
      publishedAt: release.published_at
        ? new Date(release.published_at).getTime()
        : undefined,
      createdAt: new Date(release.created_at).getTime(),
    }));
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
 * Create or update a file in a GitHub repository (for workflow file)
 */
export const createOrUpdateFile = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    path: v.string(),
    content: v.string(),
    message: v.string(),
    branch: v.string(),
  },
  handler: async (_ctx, args) => {
    // First, try to get the file to see if it exists (to get the SHA)
    const getResponse = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/contents/${args.path}?ref=${args.branch}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    let sha: string | undefined;
    if (getResponse.ok) {
      const existingFile = (await getResponse.json()) as { sha: string };
      sha = existingFile.sha;
    }

    // Create or update the file
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/contents/${args.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: args.message,
          content: Buffer.from(args.content).toString("base64"),
          branch: args.branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create/update file: ${response.statusText} - ${errorText}`
      );
    }

    return { success: true };
  },
});

/**
 * Get installation access token from GitHub App
 */
export const getInstallationToken = action({
  args: {
    installationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    // Create JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued at time (60 seconds in the past to allow for clock drift)
      exp: now + 600, // Expiration time (10 minutes)
      iss: appId,
    };

    // Simple JWT creation (you may want to use a proper JWT library)
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );

    // For proper JWT signing, you'd need a crypto library
    // This is a simplified version - in production, use a proper JWT library
    const crypto = await import("node:crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");

    const jwt = `${header}.${payloadBase64}.${signature}`;

    // Get installation access token
    const response = await fetch(
      `${GITHUB_API_URL}/app/installations/${args.installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get installation token: ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as {
      token: string;
      expires_at: string;
    };
    return {
      token: data.token,
      expiresAt: data.expires_at,
    };
  },
});

/**
 * Internal mutation to process webhook release event
 */
export const processReleaseWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    release: v.object({
      id: v.string(),
      tagName: v.string(),
      name: v.optional(v.string()),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      isDraft: v.boolean(),
      isPrerelease: v.boolean(),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.action === "deleted") {
      // Find and delete the synced release
      const existing = await ctx.db
        .query("githubReleases")
        .withIndex("by_github_release_id", (q) =>
          q
            .eq("githubConnectionId", args.connectionId)
            .eq("githubReleaseId", args.release.id)
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    // Check if release already exists
    const existing = await ctx.db
      .query("githubReleases")
      .withIndex("by_github_release_id", (q) =>
        q
          .eq("githubConnectionId", args.connectionId)
          .eq("githubReleaseId", args.release.id)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        tagName: args.release.tagName,
        name: args.release.name,
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        publishedAt: args.release.publishedAt,
        lastSyncedAt: now,
      });
    } else {
      // Insert new
      await ctx.db.insert("githubReleases", {
        organizationId: args.organizationId,
        githubConnectionId: args.connectionId,
        githubReleaseId: args.release.id,
        tagName: args.release.tagName,
        name: args.release.name,
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        publishedAt: args.release.publishedAt,
        createdAt: args.release.createdAt,
        lastSyncedAt: now,
      });
    }

    // Update connection sync status
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: now,
      lastSyncStatus: "success",
      updatedAt: now,
    });

    // Check if auto-import is enabled
    const connection = await ctx.db.get(args.connectionId);
    if (connection?.autoSyncReleases && args.action === "published") {
      // Auto-create Reflet release
      const existingRefletRelease = await ctx.db
        .query("releases")
        .withIndex("by_github_release", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("githubReleaseId", args.release.id)
        )
        .first();

      if (!existingRefletRelease) {
        await ctx.db.insert("releases", {
          organizationId: args.organizationId,
          title: args.release.name || args.release.tagName,
          description: args.release.body,
          version: args.release.tagName,
          publishedAt: now,
          githubReleaseId: args.release.id,
          githubHtmlUrl: args.release.htmlUrl,
          syncedFromGithub: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

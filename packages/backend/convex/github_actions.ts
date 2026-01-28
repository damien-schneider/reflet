import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

// Regex for parsing Link header
const LINK_HEADER_REGEX = /<([^>]+)>;\s*rel="([^"]+)"/;

// Note: createOrUpdateFile and getInstallationToken have been moved to github_node_actions.ts
// Import them from there: import { createOrUpdateFile, getInstallationToken } from "./github_node_actions"

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
    return await ctx.runQuery(internal.github.getConnectionInternal, {
      organizationId: args.organizationId,
    });
  },
});

/**
 * Save GitHub App installation from OAuth callback
 * Called from Next.js API route after validating with GitHub's API
 * This action doesn't require user auth since the installation is verified via GitHub
 */
export const saveInstallationFromCallback = action({
  args: {
    organizationId: v.id("organizations"),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"githubConnections">> => {
    return await ctx.runMutation(internal.github.saveInstallationInternal, {
      organizationId: args.organizationId,
      installationId: args.installationId,
      accountType: args.accountType,
      accountLogin: args.accountLogin,
      accountAvatarUrl: args.accountAvatarUrl,
    });
  },
});

/**
 * Parse GitHub Link header for pagination
 */
function parseLinkHeader(linkHeader: string | null): {
  next?: string;
  last?: string;
} {
  if (!linkHeader) {
    return {};
  }

  const links: Record<string, string> = {};
  const parts = linkHeader.split(",");

  for (const part of parts) {
    const match = part.match(LINK_HEADER_REGEX);
    if (match) {
      const [, url, rel] = match;
      if (url && rel) {
        links[rel] = url;
      }
    }
  }

  return links;
}

/**
 * Fetch repositories from GitHub installation with pagination support
 * Fetches ALL repositories by following pagination links
 */
export const fetchRepositories = action({
  args: {
    installationToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const allRepositories: Array<{
      id: number;
      full_name: string;
      name: string;
      default_branch: string;
      private: boolean;
      description: string | null;
    }> = [];

    let nextUrl: string | undefined =
      `${GITHUB_API_URL}/installation/repositories?per_page=100`;
    let pageCount = 0;

    // Fetch all pages
    while (nextUrl) {
      pageCount++;
      console.log(`Fetching repositories page ${pageCount}: ${nextUrl}`);

      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        total_count?: number;
        repositories: Array<{
          id: number;
          full_name: string;
          name: string;
          default_branch: string;
          private: boolean;
          description: string | null;
        }>;
      };

      console.log(
        `Page ${pageCount}: Received ${data.repositories.length} repositories. Total count: ${data.total_count ?? "unknown"}`
      );
      allRepositories.push(...data.repositories);

      // Check for next page in Link header
      const linkHeader = response.headers.get("Link");
      console.log(`Link header: ${linkHeader}`);
      const links = parseLinkHeader(linkHeader);
      nextUrl = links.next;

      if (nextUrl) {
        console.log(`Next page URL: ${nextUrl}`);
      } else {
        console.log("No more pages to fetch");
      }
    }

    console.log(
      `Finished fetching repositories. Total: ${allRepositories.length} repositories across ${pageCount} page(s)`
    );

    return allRepositories.map((repo) => ({
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

// ============================================
// ISSUES ACTIONS
// ============================================

/**
 * Fetch issues from a GitHub repository
 */
export const fetchIssues = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    state: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("all"))
    ),
    labels: v.optional(v.string()), // Comma-separated list of labels
    perPage: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams();
    params.set("state", args.state ?? "open");
    params.set("per_page", String(args.perPage ?? 100));
    if (args.labels) {
      params.set("labels", args.labels);
    }

    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/issues?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues = (await response.json()) as Array<{
      id: number;
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      state: "open" | "closed";
      labels: Array<{ name: string; color: string }>;
      user: { login: string; avatar_url: string } | null;
      milestone: { title: string } | null;
      assignees: Array<{ login: string }>;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      pull_request?: unknown; // Filter out pull requests
    }>;

    // Filter out pull requests (they have a pull_request key)
    const actualIssues = issues.filter((issue) => !issue.pull_request);

    return actualIssues.map((issue) => ({
      githubIssueId: String(issue.id),
      githubIssueNumber: issue.number,
      title: issue.title,
      body: issue.body ?? undefined,
      htmlUrl: issue.html_url,
      state: issue.state,
      githubLabels: issue.labels.map((l) => l.name),
      githubAuthor: issue.user?.login,
      githubAuthorAvatarUrl: issue.user?.avatar_url,
      githubMilestone: issue.milestone?.title,
      githubAssignees: issue.assignees.map((a) => a.login),
      githubCreatedAt: new Date(issue.created_at).getTime(),
      githubUpdatedAt: new Date(issue.updated_at).getTime(),
      githubClosedAt: issue.closed_at
        ? new Date(issue.closed_at).getTime()
        : undefined,
    }));
  },
});

/**
 * Fetch labels from a GitHub repository
 */
export const fetchLabels = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/labels?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch labels: ${response.statusText}`);
    }

    const labels = (await response.json()) as Array<{
      id: number;
      name: string;
      color: string;
      description: string | null;
    }>;

    return labels.map((label) => ({
      id: String(label.id),
      name: label.name,
      color: label.color,
      description: label.description,
    }));
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

/**
 * Internal mutation to handle auto-import of issue to feedback
 */
export const autoImportIssueToFeedback = internalMutation({
  args: {
    issueId: v.id("githubIssues"),
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    issue: v.object({
      id: v.string(),
      number: v.number(),
      title: v.string(),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      state: v.union(v.literal("open"), v.literal("closed")),
      labels: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const connection = await ctx.db.get(args.connectionId);

    if (!connection?.autoSyncIssues) {
      return;
    }

    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", args.connectionId)
      )
      .collect();

    for (const mapping of mappings) {
      if (!(mapping.autoSync && mapping.targetBoardId)) {
        continue;
      }

      const hasLabel = args.issue.labels.some(
        (label) => label.toLowerCase() === mapping.githubLabelName.toLowerCase()
      );

      if (!hasLabel) {
        continue;
      }

      if (args.issue.state === "closed" && !mapping.syncClosedIssues) {
        continue;
      }

      const feedbackStatus =
        args.issue.state === "closed" && !mapping.defaultStatus
          ? "closed"
          : (mapping.defaultStatus ?? "open");

      const feedbackId = await ctx.db.insert("feedback", {
        boardId: mapping.targetBoardId,
        organizationId: args.organizationId,
        title: args.issue.title,
        description: args.issue.body ?? "",
        status: feedbackStatus,
        authorId: "system",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        githubHtmlUrl: args.issue.htmlUrl,
        syncedFromGithub: true,
        createdAt: now,
        updatedAt: now,
      });

      if (mapping.targetTagId) {
        await ctx.db.insert("feedbackTags", {
          feedbackId,
          tagId: mapping.targetTagId,
        });
      }

      await ctx.db.patch(args.issueId, {
        refletFeedbackId: feedbackId,
      });

      break;
    }
  },
});

/**
 * Internal mutation to process webhook issue event
 */
export const processIssueWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    issue: v.object({
      id: v.string(),
      number: v.number(),
      title: v.string(),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      state: v.union(v.literal("open"), v.literal("closed")),
      labels: v.array(v.string()),
      author: v.optional(v.string()),
      authorAvatarUrl: v.optional(v.string()),
      milestone: v.optional(v.string()),
      assignees: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
      closedAt: v.optional(v.number()),
    }),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isDeleteAction =
      args.action === "deleted" || args.action === "transferred";

    const existing = await ctx.db
      .query("githubIssues")
      .withIndex("by_github_issue_id", (q) =>
        q
          .eq("githubConnectionId", args.connectionId)
          .eq("githubIssueId", args.issue.id)
      )
      .first();

    if (isDeleteAction) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    if (existing) {
      // Update existing issue
      await ctx.db.patch(existing._id, {
        title: args.issue.title,
        body: args.issue.body,
        htmlUrl: args.issue.htmlUrl,
        state: args.issue.state,
        githubLabels: args.issue.labels,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubMilestone: args.issue.milestone,
        githubAssignees: args.issue.assignees,
        githubUpdatedAt: args.issue.updatedAt,
        githubClosedAt: args.issue.closedAt,
        lastSyncedAt: now,
      });

      // Update linked feedback if exists
      if (existing.refletFeedbackId) {
        const feedback = await ctx.db.get(existing.refletFeedbackId);
        if (feedback) {
          const newStatus =
            args.issue.state === "closed" ? "closed" : feedback.status;
          await ctx.db.patch(existing.refletFeedbackId, {
            title: args.issue.title,
            description: args.issue.body ?? "",
            status: newStatus,
            updatedAt: now,
          });
        }
      }
    } else {
      // Insert new issue
      const issueId = await ctx.db.insert("githubIssues", {
        organizationId: args.organizationId,
        githubConnectionId: args.connectionId,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        title: args.issue.title,
        body: args.issue.body,
        htmlUrl: args.issue.htmlUrl,
        state: args.issue.state,
        githubLabels: args.issue.labels,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubMilestone: args.issue.milestone,
        githubAssignees: args.issue.assignees,
        githubCreatedAt: args.issue.createdAt,
        githubUpdatedAt: args.issue.updatedAt,
        githubClosedAt: args.issue.closedAt,
        lastSyncedAt: now,
      });

      // Schedule auto-import check via separate mutation
      await ctx.scheduler.runAfter(
        0,
        internal.github_actions.autoImportIssueToFeedback,
        {
          issueId,
          connectionId: args.connectionId,
          organizationId: args.organizationId,
          issue: {
            id: args.issue.id,
            number: args.issue.number,
            title: args.issue.title,
            body: args.issue.body,
            htmlUrl: args.issue.htmlUrl,
            state: args.issue.state,
            labels: args.issue.labels,
          },
        }
      );
    }

    await ctx.db.patch(args.connectionId, {
      lastIssuesSyncAt: now,
      lastIssuesSyncStatus: "success",
      updatedAt: now,
    });
  },
});

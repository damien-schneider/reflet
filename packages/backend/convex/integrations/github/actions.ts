import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { action, internalMutation } from "../../_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

// Regex for parsing Link header
const LINK_HEADER_REGEX = /<([^>]+)>;\s*rel="([^"]+)"/;

// Note: createOrUpdateFile and getInstallationToken have been moved to node_actions.ts
// Import them from there: import { createOrUpdateFile, getInstallationToken } from "./node_actions"

/**
 * Generate GitHub Action workflow content for auto-release
 */
export const generateWorkflowContent = action({
  args: {
    branch: v.string(),
    organizationSlug: v.string(),
    webhookUrl: v.string(),
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
  handler: async (ctx, args): Promise<Doc<"githubConnections"> | null> =>
    await ctx.runQuery(
      internal.integrations.github.queries.getConnectionInternal,
      {
        organizationId: args.organizationId,
      }
    ),
});

/**
 * Save user-level GitHub App installation from OAuth callback
 * Called from Next.js API route after validating with GitHub's API
 * Creates a userGithubConnections row for the user
 */
export const saveInstallationFromCallback = action({
  args: {
    accountAvatarUrl: v.optional(v.string()),
    accountLogin: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    installationId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"userGithubConnections">> => {
    const userConnectionId = await ctx.runMutation(
      internal.integrations.github.mutations.saveUserInstallation,
      {
        accountAvatarUrl: args.accountAvatarUrl,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        installationId: args.installationId,
        userId: args.userId,
      }
    );

    // Link to org if organizationId was provided
    if (args.organizationId) {
      await ctx.runMutation(
        internal.integrations.github.mutations.linkRepoToOrg,
        {
          linkedByUserId: args.userId,
          organizationId: args.organizationId,
          userGithubConnectionId: userConnectionId,
        }
      );
    }

    return userConnectionId;
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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      defaultBranch: repo.default_branch,
      description: repo.description,
      fullName: repo.full_name,
      id: String(repo.id),
      isPrivate: repo.private,
      name: repo.name,
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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      body: release.body ?? undefined,
      createdAt: new Date(release.created_at).getTime(),
      githubReleaseId: String(release.id),
      htmlUrl: release.html_url,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
      name: release.name ?? undefined,
      publishedAt: release.published_at
        ? new Date(release.published_at).getTime()
        : undefined,
      tagName: release.tag_name,
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
    secret: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks`,
      {
        body: JSON.stringify({
          active: true,
          config: {
            content_type: "json",
            insecure_ssl: "0",
            secret: args.secret,
            url: args.webhookUrl,
          },
          events: ["release"],
          name: "web",
        }),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "POST",
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
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "DELETE",
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
    action: v.string(),
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    release: v.object({
      body: v.optional(v.string()),
      createdAt: v.number(),
      htmlUrl: v.string(),
      id: v.string(),
      isDraft: v.boolean(),
      isPrerelease: v.boolean(),
      name: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      tagName: v.string(),
    }),
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
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        lastSyncedAt: now,
        name: args.release.name,
        publishedAt: args.release.publishedAt,
        tagName: args.release.tagName,
      });
    } else {
      // Insert new
      await ctx.db.insert("githubReleases", {
        body: args.release.body,
        createdAt: args.release.createdAt,
        githubConnectionId: args.connectionId,
        githubReleaseId: args.release.id,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        lastSyncedAt: now,
        name: args.release.name,
        organizationId: args.organizationId,
        publishedAt: args.release.publishedAt,
        tagName: args.release.tagName,
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
          createdAt: now,
          description: args.release.body,
          githubHtmlUrl: args.release.htmlUrl,
          githubReleaseId: args.release.id,
          organizationId: args.organizationId,
          publishedAt: now,
          syncedFromGithub: true,
          title: args.release.name || args.release.tagName,
          updatedAt: now,
          version: args.release.tagName,
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
    labels: v.optional(v.string()), // Comma-separated list of labels
    perPage: v.optional(v.number()),
    repositoryFullName: v.string(),
    state: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("all"))
    ),
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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      body: issue.body ?? undefined,
      githubAssignees: issue.assignees.map((a) => a.login),
      githubAuthor: issue.user?.login,
      githubAuthorAvatarUrl: issue.user?.avatar_url,
      githubClosedAt: issue.closed_at
        ? new Date(issue.closed_at).getTime()
        : undefined,
      githubCreatedAt: new Date(issue.created_at).getTime(),
      githubIssueId: String(issue.id),
      githubIssueNumber: issue.number,
      githubLabels: issue.labels.map((l) => l.name),
      githubMilestone: issue.milestone?.title,
      githubUpdatedAt: new Date(issue.updated_at).getTime(),
      htmlUrl: issue.html_url,
      state: issue.state,
      title: issue.title,
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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      color: label.color,
      description: label.description,
      id: String(label.id),
      name: label.name,
    }));
  },
});

/**
 * Update webhook to include issues events
 */
export const updateWebhookEvents = action({
  args: {
    events: v.array(v.string()),
    installationToken: v.string(),
    repositoryFullName: v.string(),
    webhookId: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/hooks/${args.webhookId}`,
      {
        body: JSON.stringify({
          events: args.events,
        }),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "PATCH",
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
    connectionId: v.id("githubConnections"),
    issue: v.object({
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      id: v.string(),
      labels: v.array(v.string()),
      number: v.number(),
      state: v.union(v.literal("open"), v.literal("closed")),
      title: v.string(),
    }),
    issueId: v.id("githubIssues"),
    organizationId: v.id("organizations"),
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
      if (!mapping.autoSync) {
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
        authorId: "system",
        commentCount: 0,
        createdAt: now,
        description: args.issue.body ?? "",
        githubHtmlUrl: args.issue.htmlUrl,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        isApproved: true,
        isPinned: false,
        organizationId: args.organizationId,
        status: feedbackStatus,
        syncedFromGithub: true,
        title: args.issue.title,
        updatedAt: now,
        voteCount: 0,
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
    action: v.string(),
    connectionId: v.id("githubConnections"),
    issue: v.object({
      assignees: v.optional(v.array(v.string())),
      author: v.optional(v.string()),
      authorAvatarUrl: v.optional(v.string()),
      body: v.optional(v.string()),
      closedAt: v.optional(v.number()),
      createdAt: v.number(),
      htmlUrl: v.string(),
      id: v.string(),
      labels: v.array(v.string()),
      milestone: v.optional(v.string()),
      number: v.number(),
      state: v.union(v.literal("open"), v.literal("closed")),
      title: v.string(),
      updatedAt: v.number(),
    }),
    organizationId: v.id("organizations"),
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
        body: args.issue.body,
        githubAssignees: args.issue.assignees,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubClosedAt: args.issue.closedAt,
        githubLabels: args.issue.labels,
        githubMilestone: args.issue.milestone,
        githubUpdatedAt: args.issue.updatedAt,
        htmlUrl: args.issue.htmlUrl,
        lastSyncedAt: now,
        state: args.issue.state,
        title: args.issue.title,
      });

      // Update linked feedback if exists
      if (existing.refletFeedbackId) {
        const feedback = await ctx.db.get(existing.refletFeedbackId);
        if (feedback) {
          const newStatus =
            args.issue.state === "closed" ? "closed" : feedback.status;
          await ctx.db.patch(existing.refletFeedbackId, {
            description: args.issue.body ?? "",
            status: newStatus,
            title: args.issue.title,
            updatedAt: now,
          });
        }
      }
    } else {
      // Insert new issue
      const issueId = await ctx.db.insert("githubIssues", {
        body: args.issue.body,
        githubAssignees: args.issue.assignees,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubClosedAt: args.issue.closedAt,
        githubConnectionId: args.connectionId,
        githubCreatedAt: args.issue.createdAt,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        githubLabels: args.issue.labels,
        githubMilestone: args.issue.milestone,
        githubUpdatedAt: args.issue.updatedAt,
        htmlUrl: args.issue.htmlUrl,
        lastSyncedAt: now,
        organizationId: args.organizationId,
        state: args.issue.state,
        title: args.issue.title,
      });

      // Schedule auto-import check via separate mutation
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.actions.autoImportIssueToFeedback,
        {
          connectionId: args.connectionId,
          issue: {
            body: args.issue.body,
            htmlUrl: args.issue.htmlUrl,
            id: args.issue.id,
            labels: args.issue.labels,
            number: args.issue.number,
            state: args.issue.state,
            title: args.issue.title,
          },
          issueId,
          organizationId: args.organizationId,
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

// Regex to match feedback references in PR title/body
const FEEDBACK_REF_REGEX = /(?:fixes|closes|resolves)\s+reflet:([a-z0-9]+)/gi;

/**
 * Process a merged pull request webhook.
 * Looks for feedback references like "fixes reflet:{feedbackId}" in PR title/body
 * and updates the referenced feedback status to "completed".
 */
export const processPullRequestWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    pullRequest: v.object({
      authorLogin: v.optional(v.string()),
      baseRef: v.string(),
      body: v.optional(v.string()),
      headRef: v.string(),
      htmlUrl: v.string(),
      id: v.string(),
      mergedAt: v.optional(v.number()),
      number: v.number(),
      title: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { pullRequest } = args;
    const now = Date.now();

    // Combine title and body to search for references
    const searchText = [pullRequest.title, pullRequest.body ?? ""].join("\n");

    // Find all feedback references
    const feedbackIds: string[] = [];
    let match: RegExpExecArray | null = null;

    // Reset regex state
    FEEDBACK_REF_REGEX.lastIndex = 0;
    match = FEEDBACK_REF_REGEX.exec(searchText);
    while (match !== null) {
      feedbackIds.push(match[1]);
      match = FEEDBACK_REF_REGEX.exec(searchText);
    }

    if (feedbackIds.length === 0) {
      return { processed: 0 };
    }

    let processed = 0;

    for (const feedbackId of feedbackIds) {
      try {
        const feedback = await ctx.db.get(feedbackId as Id<"feedback">);

        if (!feedback) {
          continue;
        }

        // Verify feedback belongs to the same organization
        if (feedback.organizationId !== args.organizationId) {
          continue;
        }

        // Only update if not already completed
        if (feedback.status === "completed") {
          continue;
        }

        await ctx.db.patch(feedback._id, {
          status: "completed",
          updatedAt: now,
        });

        // Create activity log
        await ctx.db.insert("activityLogs", {
          action: "status_changed",
          authorId: "system",
          createdAt: now,
          details: JSON.stringify({
            newStatus: "completed",
            oldStatus: feedback.status,
            prNumber: pullRequest.number,
            prUrl: pullRequest.htmlUrl,
            source: "github_pr",
          }),
          feedbackId: feedback._id,
          organizationId: args.organizationId,
        });

        processed++;
      } catch {
        // Skip individual processing failures
      }
    }

    return { processed };
  },
});

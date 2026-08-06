import { v } from "convex/values";
import { internalAction, internalMutation } from "../../_generated/server";
import { GITHUB_API_URL } from "./github_constants";

export const fetchIssues = internalAction({
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
export const fetchLabels = internalAction({
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

import { v } from "convex/values";
import { z } from "zod";
import type { Id } from "../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../../_generated/server";
import { statusFieldsFor } from "../../feedback/status_target";
import { SYSTEM_ACTOR_ID } from "../../shared/actors";
import { GITHUB_API_URL, githubApiHeaders } from "./github_constants";
import { feedbackIdFromIssueBody } from "./issue_body";
import { attachIssueToFeedback } from "./issue_promote";

const githubLabelsResponse = z.array(
  z.object({
    color: z.string(),
    description: z.string().nullable(),
    id: z.number(),
    name: z.string(),
  })
);
const githubIssuesResponse = z.array(
  z.object({
    assignees: z.array(z.object({ login: z.string() })),
    body: z.string().nullable(),
    closed_at: z.string().nullable(),
    created_at: z.string(),
    html_url: z.url(),
    id: z.number(),
    labels: z.array(z.object({ color: z.string(), name: z.string() })),
    milestone: z.object({ title: z.string() }).nullable(),
    number: z.number(),
    pull_request: z.unknown().optional(),
    state: z.enum(["open", "closed"]),
    title: z.string(),
    updated_at: z.string(),
    user: z.object({ avatar_url: z.url(), login: z.string() }).nullable(),
  })
);

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
      { headers: githubApiHeaders(args.installationToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues = githubIssuesResponse.parse(await response.json());

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

export const fetchLabels = internalAction({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/labels?per_page=100`,
      { headers: githubApiHeaders(args.installationToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch labels: ${response.statusText}`);
    }

    const labels = githubLabelsResponse.parse(await response.json());

    return labels.map((label) => ({
      color: label.color,
      description: label.description,
      id: String(label.id),
      name: label.name,
    }));
  },
});

async function linkPromotedFeedback(
  ctx: MutationCtx,
  args: {
    issue: { body?: string };
    issueId: Id<"githubIssues">;
    organizationId: Id<"organizations">;
  }
): Promise<boolean> {
  const marker = feedbackIdFromIssueBody(args.issue.body);
  const feedbackId = marker ? ctx.db.normalizeId("feedback", marker) : null;
  const feedback = feedbackId ? await ctx.db.get(feedbackId) : null;
  if (!feedback || feedback.organizationId !== args.organizationId) {
    return false;
  }
  const issue = await ctx.db.get(args.issueId);
  if (issue && !feedback.githubIssueId) {
    await attachIssueToFeedback(ctx, feedback, issue);
  }
  return true;
}

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
    if (await linkPromotedFeedback(ctx, args)) {
      return;
    }

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
        authorId: SYSTEM_ACTOR_ID,
        commentCount: 0,
        createdAt: now,
        description: args.issue.body ?? "",
        githubHtmlUrl: args.issue.htmlUrl,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        isApproved: true,
        isPinned: false,
        organizationId: args.organizationId,
        ...(await statusFieldsFor(ctx, {
          organizationId: args.organizationId,
          status: feedbackStatus,
        })),
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

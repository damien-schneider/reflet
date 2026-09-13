import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server";
import { emitWebhookEvent } from "../../webhooks/mutations";
import { GITHUB_API_URL, githubApiHeaders } from "./github_constants";
import { buildIssueBody } from "./issue_body";

const createdIssueSchema = z.object({
  body: z.string().nullable(),
  created_at: z.string(),
  html_url: z.string(),
  id: z.number(),
  labels: z.array(z.object({ name: z.string() })),
  number: z.number(),
  state: z.enum(["open", "closed"]),
  title: z.string(),
  updated_at: z.string(),
});

export interface GithubIssueRef {
  htmlUrl: string;
  issueNumber: number;
}

export async function attachIssueToFeedback(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  issue: Doc<"githubIssues">
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(issue._id, {
    lastSyncedAt: now,
    refletFeedbackId: feedback._id,
  });
  await ctx.db.patch(feedback._id, {
    githubHtmlUrl: issue.htmlUrl,
    githubIssueId: issue.githubIssueId,
    githubIssueNumber: issue.githubIssueNumber,
    updatedAt: now,
  });
  await ctx.db.insert("activityLogs", {
    action: "github_issue_linked",
    authorId: "system",
    createdAt: now,
    details: JSON.stringify({
      htmlUrl: issue.htmlUrl,
      issueNumber: issue.githubIssueNumber,
    }),
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });
  await emitWebhookEvent(ctx, {
    event: "feedback.github_issue_created",
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });
}

export const getPromoteContext = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }
    const organization = await ctx.db.get(feedback.organizationId);
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .first();

    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
      .collect();
    const tagIds = new Set(feedbackTags.map((link) => link.tagId));
    const mappings = connection
      ? await ctx.db
          .query("githubLabelMappings")
          .withIndex("by_connection", (q) =>
            q.eq("githubConnectionId", connection._id)
          )
          .collect()
      : [];
    const labels = mappings
      .filter(
        (mapping) => mapping.targetTagId && tagIds.has(mapping.targetTagId)
      )
      .map((mapping) => mapping.githubLabelName);

    const screenshotDocs = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
      .collect();
    const screenshots = await Promise.all(
      screenshotDocs.map(async (screenshot) => ({
        filename: screenshot.filename,
        url: await ctx.storage.getUrl(
          screenshot.annotatedStorageId ?? screenshot.storageId
        ),
      }))
    );

    return {
      connection,
      feedback,
      labels,
      organizationSlug: organization?.slug,
      screenshots,
    };
  },
});

export const linkGithubIssue = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    feedbackId: v.id("feedback"),
    issue: v.object({
      body: v.optional(v.string()),
      createdAt: v.number(),
      htmlUrl: v.string(),
      id: v.string(),
      labels: v.array(v.string()),
      number: v.number(),
      state: v.union(v.literal("open"), v.literal("closed")),
      title: v.string(),
      updatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    if (feedback.githubIssueId && feedback.githubIssueId !== args.issue.id) {
      throw new Error("Feedback is already linked to another GitHub issue");
    }

    const existingRow = await ctx.db
      .query("githubIssues")
      .withIndex("by_github_issue_id", (q) =>
        q
          .eq("githubConnectionId", args.connectionId)
          .eq("githubIssueId", args.issue.id)
      )
      .first();
    const rowId =
      existingRow?._id ??
      (await ctx.db.insert("githubIssues", {
        body: args.issue.body,
        githubConnectionId: args.connectionId,
        githubCreatedAt: args.issue.createdAt,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        githubLabels: args.issue.labels,
        githubUpdatedAt: args.issue.updatedAt,
        htmlUrl: args.issue.htmlUrl,
        lastSyncedAt: Date.now(),
        organizationId: feedback.organizationId,
        state: args.issue.state,
        title: args.issue.title,
      }));
    const row = await ctx.db.get(rowId);
    if (!row) {
      throw new Error("GitHub issue row not found");
    }
    if (row.refletFeedbackId !== feedback._id) {
      await attachIssueToFeedback(ctx, feedback, row);
    }
  },
});

export const promoteFeedback = internalAction({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<GithubIssueRef> => {
    const context = await ctx.runQuery(
      internal.integrations.github.issue_promote.getPromoteContext,
      { feedbackId: args.feedbackId }
    );
    if (!context || context.feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }
    const { connection, feedback } = context;
    if (feedback.githubHtmlUrl && feedback.githubIssueNumber !== undefined) {
      return {
        htmlUrl: feedback.githubHtmlUrl,
        issueNumber: feedback.githubIssueNumber,
      };
    }
    if (!connection?.repositoryFullName) {
      throw new Error("No GitHub repository connected");
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );
    const siteUrl = process.env.SITE_URL ?? "";
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${connection.repositoryFullName}/issues`,
      {
        body: JSON.stringify({
          body: buildIssueBody({
            dashboardUrl: `${siteUrl}/dashboard/${context.organizationSlug}/feedback/${feedback._id}`,
            feedback,
            screenshots: context.screenshots,
          }),
          labels: context.labels,
          title: feedback.title,
        }),
        headers: githubApiHeaders(token),
        method: "POST",
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to create GitHub issue: ${response.status} ${await response.text()}`
      );
    }
    const issue = createdIssueSchema.parse(await response.json());

    await ctx.runMutation(
      internal.integrations.github.issue_promote.linkGithubIssue,
      {
        connectionId: connection._id,
        feedbackId: feedback._id,
        issue: {
          body: issue.body ?? undefined,
          createdAt: new Date(issue.created_at).getTime(),
          htmlUrl: issue.html_url,
          id: String(issue.id),
          labels: issue.labels.map((label) => label.name),
          number: issue.number,
          state: issue.state,
          title: issue.title,
          updatedAt: new Date(issue.updated_at).getTime(),
        },
      }
    );
    return { htmlUrl: issue.html_url, issueNumber: issue.number };
  },
});

export const getCloseContext = internalQuery({
  args: { issueId: v.id("githubIssues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) {
      return null;
    }
    const connection = await ctx.db.get(issue.githubConnectionId);
    if (!connection?.repositoryFullName) {
      return null;
    }
    return {
      installationId: connection.installationId,
      issue,
      repositoryFullName: connection.repositoryFullName,
    };
  },
});

export const markIssueClosed = internalMutation({
  args: { issueId: v.id("githubIssues") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.issueId, {
      githubClosedAt: now,
      lastSyncedAt: now,
      state: "closed",
    });
  },
});

export const closeIssue = internalAction({
  args: {
    issueId: v.id("githubIssues"),
    stateReason: v.union(v.literal("completed"), v.literal("not_planned")),
  },
  handler: async (ctx, args): Promise<void> => {
    const context = await ctx.runQuery(
      internal.integrations.github.issue_promote.getCloseContext,
      { issueId: args.issueId }
    );
    if (!context || context.issue.state === "closed") {
      return;
    }
    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: context.installationId }
    );
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${context.repositoryFullName}/issues/${context.issue.githubIssueNumber}`,
      {
        body: JSON.stringify({
          state: "closed",
          state_reason: args.stateReason,
        }),
        headers: githubApiHeaders(token),
        method: "PATCH",
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to close GitHub issue: ${response.status} ${await response.text()}`
      );
    }
    await ctx.runMutation(
      internal.integrations.github.issue_promote.markIssueClosed,
      { issueId: args.issueId }
    );
  },
});

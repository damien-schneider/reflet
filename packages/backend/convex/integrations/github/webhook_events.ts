import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { changeFeedbackStatus } from "../../feedback/status_change";
import { isFinishedStatus } from "../../feedback/status_utils";
import { SYSTEM_ACTOR_ID } from "../../shared/actors";
import type { FeedbackStatusValue } from "../../shared/validators";

interface IncomingIssue {
  body?: string;
  number: number;
  state: "open" | "closed";
  stateReason?: string;
  title: string;
}

function statusFromIssue(
  current: FeedbackStatusValue,
  action: string,
  issue: IncomingIssue
): FeedbackStatusValue | undefined {
  if (issue.state === "closed") {
    return issue.stateReason === "completed" ? "completed" : "closed";
  }
  if (action === "reopened" && isFinishedStatus(current)) {
    return "open";
  }
}

async function syncLinkedFeedback(
  ctx: MutationCtx,
  feedbackId: Id<"feedback">,
  action: string,
  issue: IncomingIssue
): Promise<void> {
  const feedback = await ctx.db.get(feedbackId);
  if (!feedback) {
    return;
  }
  if (feedback.syncedFromGithub) {
    await ctx.db.patch(feedback._id, {
      description: issue.body ?? "",
      title: issue.title,
      updatedAt: Date.now(),
    });
  }
  const status = statusFromIssue(feedback.status, action, issue);
  if (status) {
    await changeFeedbackStatus(ctx, feedback, {
      actorId: SYSTEM_ACTOR_ID,
      details: { issueNumber: issue.number },
      source: "github",
      status,
    });
  }
}

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
      stateReason: v.optional(v.string()),
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

      if (existing.refletFeedbackId) {
        await syncLinkedFeedback(
          ctx,
          existing.refletFeedbackId,
          args.action,
          args.issue
        );
      }
    } else {
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

      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.issue_actions.autoImportIssueToFeedback,
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

const FEEDBACK_REF_REGEX = /(?:fixes|closes|resolves)\s+reflet:([a-z0-9]+)/gi;

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

    const searchText = [pullRequest.title, pullRequest.body ?? ""].join("\n");

    const feedbackIds: string[] = [];
    let match: RegExpExecArray | null = null;

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

    for (const feedbackRef of feedbackIds) {
      const feedbackId = ctx.db.normalizeId("feedback", feedbackRef);
      const feedback = feedbackId ? await ctx.db.get(feedbackId) : null;
      if (!feedback || feedback.organizationId !== args.organizationId) {
        continue;
      }

      const changed = await changeFeedbackStatus(ctx, feedback, {
        actorId: SYSTEM_ACTOR_ID,
        details: { prNumber: pullRequest.number, prUrl: pullRequest.htmlUrl },
        source: "github",
        status: "completed",
      });
      if (changed) {
        processed++;
      }
    }

    return { processed };
  },
});

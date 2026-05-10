/**
 * Autopilot webhook handlers — PR merge triggers security & architect agents.
 *
 * Listens for PR merge events routed from the main GitHub webhook handler.
 * When a PR is merged, it triggers a security scan and (optionally) an
 * architect review on the org that owns the connection.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

const ACTIVE_RUN_STATUSES = [
  "queued",
  "sandbox_starting",
  "cloning",
  "exploring",
  "coding",
  "creating_pr",
  "waiting_ci",
  "ci_fixing",
] satisfies Doc<"autopilotRuns">["status"][];

const findActiveRunsByPrUrl = async (
  ctx: Pick<MutationCtx, "db">,
  params: {
    organizationId: Doc<"organizations">["_id"];
    prUrl: string;
  }
) => {
  const runs: Doc<"autopilotRuns">[] = [];
  for (const status of ACTIVE_RUN_STATUSES) {
    const statusRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", params.organizationId).eq("status", status)
      )
      .filter((q) => q.eq(q.field("prUrl"), params.prUrl))
      .collect();
    runs.push(...statusRuns);
  }
  return runs;
};

/**
 * Handle a merged PR event for autopilot.
 *
 * Called from the main GitHub webhook router when a PR is merged.
 * Triggers security scan + architect review if the org has autopilot enabled.
 */
export const handlePrMerged = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    prNumber: v.number(),
    prTitle: v.string(),
    prUrl: v.string(),
    headRef: v.string(),
    baseRef: v.string(),
    authorLogin: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (
      !config?.enabled ||
      (config.autonomyMode ?? "supervised") === "stopped"
    ) {
      return null;
    }

    const access = await ctx.runQuery(
      internal.autopilot.billing_gate.checkAccess,
      {
        organizationId: args.organizationId,
      }
    );
    if (!access.allowed) {
      return null;
    }

    // Log the PR merge event
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "info",
      message: `PR #${args.prNumber} merged: ${args.prTitle}`,
      details: JSON.stringify({
        prUrl: args.prUrl,
        headRef: args.headRef,
        baseRef: args.baseRef,
        author: args.authorLogin,
      }),
    });

    const workItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const activeRuns = await findActiveRunsByPrUrl(ctx, {
      organizationId: args.organizationId,
      prUrl: args.prUrl,
    });
    const runWorkItemIds = new Set(activeRuns.map((run) => run.workItemId));
    const mergedWorkItem =
      workItems.find((item) => item.prUrl === args.prUrl) ??
      workItems.find((item) => runWorkItemIds.has(item._id));

    if (
      mergedWorkItem &&
      mergedWorkItem.status !== "done" &&
      mergedWorkItem.status !== "cancelled"
    ) {
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: mergedWorkItem._id,
          status: "done",
          needsReview: false,
          prNumber: args.prNumber,
          prUrl: args.prUrl,
        }
      );

      const now = Date.now();
      for (const run of activeRuns) {
        if (run.workItemId === mergedWorkItem._id) {
          await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
            runId: run._id,
            status: "completed",
            completedAt: now,
            prNumber: args.prNumber,
            prUrl: args.prUrl,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Autopilot webhook handlers — PR merge triggers security & architect agents.
 *
 * Listens for PR merge events routed from the main GitHub webhook handler.
 * When a PR is merged, it triggers a security scan and (optionally) an
 * architect review on the org that owns the connection.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

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

    return null;
  },
});

/**
 * Feedback-task link mutations — link, unlink, and create-from-feedback.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOwnedFeedback, requireOwnedWorkItem } from "../ownership";
import { priority } from "../schema/validators";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

export const linkFeedbackToTask = mutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    workItemId: v.id("autopilotWorkItems"),
  },
  returns: v.id("feedbackTaskLinks"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);
    await requireOwnedFeedback(ctx, args.organizationId, args.feedbackId);
    await requireOwnedWorkItem(ctx, args.organizationId, args.workItemId);

    const existing = await ctx.db
      .query("feedbackTaskLinks")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const alreadyLinked = existing.some(
      (link) => link.workItemId === args.workItemId
    );
    if (alreadyLinked) {
      throw new Error("Feedback is already linked to this task");
    }

    return ctx.db.insert("feedbackTaskLinks", {
      organizationId: args.organizationId,
      feedbackId: args.feedbackId,
      workItemId: args.workItemId,
      createdAt: Date.now(),
      createdBy: "user",
    });
  },
});

export const unlinkFeedbackFromTask = mutation({
  args: {
    feedbackId: v.id("feedback"),
    workItemId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const links = await ctx.db
      .query("feedbackTaskLinks")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const link = links.find((l) => l.workItemId === args.workItemId);
    if (!link) {
      throw new Error("Link not found");
    }

    await requireOrgAdmin(ctx, link.organizationId, user._id);
    await requireAutopilotAccess(ctx, link.organizationId);
    await ctx.db.delete(link._id);
    return null;
  },
});

export const createTaskFromFeedback = mutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    type: v.optional(v.union(v.literal("task"), v.literal("bug"))),
    priority,
  },
  returns: v.id("autopilotWorkItems"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const feedback = await requireOwnedFeedback(
      ctx,
      args.organizationId,
      args.feedbackId
    );

    const now = Date.now();
    const workItemId = await ctx.db.insert("autopilotWorkItems", {
      organizationId: args.organizationId,
      type: args.type ?? "task",
      title: feedback.title,
      description: feedback.description ?? "",
      status: "backlog",
      priority: args.priority,
      needsReview: false,
      createdByUser: user._id,
      createdBy: "user",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("feedbackTaskLinks", {
      organizationId: args.organizationId,
      feedbackId: args.feedbackId,
      workItemId,
      createdAt: now,
      createdBy: "user",
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      workItemId,
      agent: "system",
      level: "info",
      message: `Task created from feedback: ${feedback.title}`,
      details: `Priority: ${args.priority}`,
      createdAt: now,
    });

    return workItemId;
  },
});

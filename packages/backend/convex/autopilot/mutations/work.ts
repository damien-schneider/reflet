/**
 * Work item mutations — create, update, delete.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  assignedAgent,
  priority,
  workItemStatus,
  workItemType,
} from "../schema/validators";
import { requireOrgAdmin } from "./auth";

export const createWorkItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: workItemType,
    title: v.string(),
    description: v.string(),
    priority,
    parentId: v.optional(v.id("autopilotWorkItems")),
    assignedAgent: v.optional(assignedAgent),
    acceptanceCriteria: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    isPublicRoadmap: v.optional(v.boolean()),
    includeInChangelog: v.optional(v.boolean()),
    createdByUser: v.optional(v.string()),
  },
  returns: v.id("autopilotWorkItems"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const now = Date.now();
    const workItemId = await ctx.db.insert("autopilotWorkItems", {
      organizationId: args.organizationId,
      type: args.type,
      parentId: args.parentId,
      title: args.title,
      description: args.description,
      status: "backlog",
      priority: args.priority,
      assignedAgent: args.assignedAgent,
      needsReview: args.needsReview ?? false,
      reviewType: args.reviewType,
      acceptanceCriteria: args.acceptanceCriteria,
      tags: args.tags,
      completionPercent: args.type === "initiative" ? 0 : undefined,
      isPublicRoadmap: args.isPublicRoadmap,
      includeInChangelog: args.includeInChangelog,
      createdByUser: args.createdByUser,
      createdBy: "user",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      workItemId,
      agent: "system",
      level: "info",
      message: `User created ${args.type}: ${args.title}`,
      details: `Priority: ${args.priority}`,
      createdAt: now,
    });

    return workItemId;
  },
});

export const updateWorkItem = mutation({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(workItemStatus),
    priority: v.optional(priority),
    assignedAgent: v.optional(assignedAgent),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    completionPercent: v.optional(v.number()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    branch: v.optional(v.string()),
    isPublicRoadmap: v.optional(v.boolean()),
    includeInChangelog: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const { workItemId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (args.needsReview === false && item.needsReview) {
      updates.reviewedAt = Date.now();
    }

    await ctx.db.patch(workItemId, updates);
    return null;
  },
});

export const deleteWorkItem = mutation({
  args: { workItemId: v.id("autopilotWorkItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    await ctx.db.patch(args.workItemId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.workItemId,
      agent: "system",
      level: "warning",
      message: `Work item cancelled: ${item.title}`,
      createdAt: Date.now(),
    });

    return null;
  },
});

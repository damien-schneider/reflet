/**
 * Work item mutations — create, update, delete, assign, bulk update.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { allocateWorkItemIdentifier } from "../lib/identifier";
import { requireOwnedWorkItem } from "../ownership";
import {
  assignedAgent,
  priority,
  workItemStatus,
  workItemType,
} from "../schema/validators";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

export const createWorkItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: workItemType,
    title: v.string(),
    description: v.string(),
    priority,
    parentId: v.optional(v.id("autopilotWorkItems")),
    assignedAgent: v.optional(assignedAgent),
    assigneeUserId: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    targetDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    estimate: v.optional(v.number()),
    confidence: v.optional(v.number()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    isPublicRoadmap: v.optional(v.boolean()),
    includeInChangelog: v.optional(v.boolean()),
    createdByUser: v.optional(v.string()),
    status: v.optional(workItemStatus),
  },
  returns: v.id("autopilotWorkItems"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);
    if (args.parentId !== undefined) {
      await requireOwnedWorkItem(ctx, args.organizationId, args.parentId);
    }

    const identifier = await allocateWorkItemIdentifier(
      ctx,
      args.organizationId
    );

    const now = Date.now();
    const workItemId = await ctx.db.insert("autopilotWorkItems", {
      organizationId: args.organizationId,
      type: args.type,
      parentId: args.parentId,
      title: args.title,
      description: args.description,
      status: args.status ?? "backlog",
      priority: args.priority,
      assignedAgent: args.assignedAgent,
      assigneeUserId: args.assigneeUserId,
      dueDate: args.dueDate,
      targetDate: args.targetDate,
      startDate: args.startDate,
      estimate: args.estimate,
      confidence: args.confidence,
      identifier,
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
      details: `Priority: ${args.priority} • ${identifier}`,
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
    assigneeUserId: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    targetDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    estimate: v.optional(v.number()),
    confidence: v.optional(v.number()),
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
    await requireAutopilotAccess(ctx, item.organizationId);

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
    await requireAutopilotAccess(ctx, item.organizationId);

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

export const assignWorkItem = mutation({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    assigneeUserId: v.optional(v.string()),
    assignedAgent: v.optional(assignedAgent),
    clearAssigneeUser: v.optional(v.boolean()),
    clearAssignedAgent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);
    await requireAutopilotAccess(ctx, item.organizationId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.assigneeUserId !== undefined) {
      updates.assigneeUserId = args.assigneeUserId;
    } else if (args.clearAssigneeUser === true) {
      updates.assigneeUserId = undefined;
    }

    if (args.assignedAgent !== undefined) {
      updates.assignedAgent = args.assignedAgent;
    } else if (args.clearAssignedAgent === true) {
      updates.assignedAgent = undefined;
    }

    await ctx.db.patch(args.workItemId, updates);
    return null;
  },
});

const BULK_UPDATE_MAX = 200;

export const bulkUpdateWorkItems = mutation({
  args: {
    organizationId: v.id("organizations"),
    workItemIds: v.array(v.id("autopilotWorkItems")),
    status: v.optional(workItemStatus),
    priority: v.optional(priority),
    assignedAgent: v.optional(assignedAgent),
    assigneeUserId: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    isPublicRoadmap: v.optional(v.boolean()),
    includeInChangelog: v.optional(v.boolean()),
  },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    if (args.workItemIds.length === 0) {
      return { updated: 0 };
    }
    if (args.workItemIds.length > BULK_UPDATE_MAX) {
      throw new Error(
        `bulkUpdateWorkItems supports up to ${BULK_UPDATE_MAX} items per call`
      );
    }

    // Verify every id belongs to this org BEFORE writing anything.
    const items = await Promise.all(
      args.workItemIds.map((id) => ctx.db.get(id))
    );
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item) {
        throw new Error(`Work item ${args.workItemIds[i]} not found`);
      }
      if (item.organizationId !== args.organizationId) {
        throw new Error("All work items must belong to the requested org");
      }
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.priority !== undefined) {
      patch.priority = args.priority;
    }
    if (args.assignedAgent !== undefined) {
      patch.assignedAgent = args.assignedAgent;
    }
    if (args.assigneeUserId !== undefined) {
      patch.assigneeUserId = args.assigneeUserId;
    }
    if (args.dueDate !== undefined) {
      patch.dueDate = args.dueDate;
    }
    if (args.isPublicRoadmap !== undefined) {
      patch.isPublicRoadmap = args.isPublicRoadmap;
    }
    if (args.includeInChangelog !== undefined) {
      patch.includeInChangelog = args.includeInChangelog;
    }

    let updated = 0;
    for (const id of args.workItemIds) {
      await ctx.db.patch(id, patch);
      updated += 1;
    }

    return { updated };
  },
});

const TRIAGE_BATCH_LIMIT = 200;

/**
 * Idempotent backfill: flips legacy `needsReview === true` items into the
 * new `triage` status, except already-terminal items. Re-running causes no
 * additional changes since `needsReview` is also cleared per pass.
 *
 * Admin-gated to prevent abuse. Returns the number of items migrated.
 */
export const migrateNeedsReviewToTriage = mutation({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.object({ migrated: v.number(), scanned: v.number() }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const limit = Math.min(
      args.limit ?? TRIAGE_BATCH_LIMIT,
      TRIAGE_BATCH_LIMIT
    );

    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .take(limit);

    let migrated = 0;
    const now = Date.now();
    for (const item of items) {
      const isTerminal = item.status === "done" || item.status === "cancelled";
      const patch: Record<string, unknown> = {
        needsReview: false,
        updatedAt: now,
      };
      if (!isTerminal) {
        patch.status = "triage";
      }
      await ctx.db.patch(item._id, patch);
      migrated += 1;
    }

    return { migrated, scanned: items.length };
  },
});

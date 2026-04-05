/**
 * Inbox mutations — approve/reject work items or documents that need review.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

export const approveWorkItem = mutation({
  args: { workItemId: v.id("autopilotWorkItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.workItemId, {
      needsReview: false,
      reviewedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.workItemId,
      agent: "system",
      level: "success",
      message: `Approved ${item.type}: ${item.title}`,
      createdAt: now,
    });

    return null;
  },
});

export const rejectWorkItem = mutation({
  args: { workItemId: v.id("autopilotWorkItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.workItemId, {
      needsReview: false,
      reviewedAt: now,
      status: "cancelled",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.workItemId,
      agent: "system",
      level: "warning",
      message: `Rejected ${item.type}: ${item.title}`,
      createdAt: now,
    });

    return null;
  },
});

export const approveDocument = mutation({
  args: { documentId: v.id("autopilotDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    await requireOrgAdmin(ctx, doc.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      needsReview: false,
      reviewedAt: now,
      status: "published",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: doc.organizationId,
      agent: "system",
      level: "success",
      message: `Approved document: ${doc.title}`,
      createdAt: now,
    });

    return null;
  },
});

export const rejectDocument = mutation({
  args: { documentId: v.id("autopilotDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    await requireOrgAdmin(ctx, doc.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      needsReview: false,
      reviewedAt: now,
      status: "archived",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: doc.organizationId,
      agent: "system",
      level: "warning",
      message: `Rejected document: ${doc.title}`,
      createdAt: now,
    });

    return null;
  },
});

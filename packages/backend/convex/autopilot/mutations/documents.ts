/**
 * Document mutations — public, auth-gated.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

export const createDocument = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("autopilotDocuments"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const now = Date.now();
    return ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      status: "published",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id("autopilotDocuments"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, doc.organizationId, user._id);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.content !== undefined) {
      updates.content = args.content;
    }
    if (args.tags !== undefined) {
      updates.tags = args.tags;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.documentId, updates);
    return null;
  },
});

export const archiveDocument = mutation({
  args: { documentId: v.id("autopilotDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, doc.organizationId, user._id);

    await ctx.db.patch(args.documentId, {
      status: "archived",
      updatedAt: Date.now(),
    });
    return null;
  },
});

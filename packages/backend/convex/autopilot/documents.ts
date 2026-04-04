/**
 * Documents — flexible document storage for all agents.
 *
 * Supports freeform types, tags, and linking to other records
 * (competitors, leads, initiatives, etc.).
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

export const createDocument = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceAgent: v.optional(assignedAgent),
    linkedTable: v.optional(v.string()),
    linkedId: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
  },
  returns: v.id("autopilotDocuments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      sourceAgent: args.sourceAgent,
      linkedTable: args.linkedTable,
      linkedId: args.linkedId,
      status: args.status ?? "published",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDocument = internalMutation({
  args: {
    documentId: v.id("autopilotDocuments"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    linkedTable: v.optional(v.string()),
    linkedId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      return null;
    }

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
    if (args.linkedTable !== undefined) {
      updates.linkedTable = args.linkedTable;
    }
    if (args.linkedId !== undefined) {
      updates.linkedId = args.linkedId;
    }

    await ctx.db.patch(args.documentId, updates);
    return null;
  },
});

export const getDocumentsByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      const { type } = args;
      return await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .collect();
    }

    return await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getDocumentsByLinked = internalQuery({
  args: {
    linkedTable: v.string(),
    linkedId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_linked", (q) =>
        q.eq("linkedTable", args.linkedTable).eq("linkedId", args.linkedId)
      )
      .collect();
  },
});

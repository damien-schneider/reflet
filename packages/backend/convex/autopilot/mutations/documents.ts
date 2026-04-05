/**
 * Document mutations — create, update, archive, approve.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  documentStatus,
  documentType,
  impactLevel,
} from "../schema/validators";
import { requireOrgAdmin } from "./auth";

export const createDocument = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: documentType,
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    platform: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    linkedWorkItemId: v.optional(v.id("autopilotWorkItems")),
    linkedCompetitorId: v.optional(v.id("autopilotCompetitors")),
    linkedLeadId: v.optional(v.id("autopilotLeads")),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
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
      status: "draft",
      needsReview: args.needsReview ?? false,
      reviewType: args.reviewType,
      platform: args.platform,
      targetUrl: args.targetUrl,
      linkedWorkItemId: args.linkedWorkItemId,
      linkedCompetitorId: args.linkedCompetitorId,
      linkedLeadId: args.linkedLeadId,
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
    status: v.optional(documentStatus),
    needsReview: v.optional(v.boolean()),
    platform: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    relevanceScore: v.optional(v.number()),
    impactLevel: v.optional(impactLevel),
    sourceUrls: v.optional(v.array(v.string())),
    keyFindings: v.optional(v.array(v.string())),
    metadata: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, doc.organizationId, user._id);

    const { documentId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (args.needsReview === false && doc.needsReview) {
      updates.reviewedAt = Date.now();
    }

    if (args.publishedUrl && !doc.publishedAt) {
      updates.publishedAt = Date.now();
    }

    await ctx.db.patch(documentId, updates);
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

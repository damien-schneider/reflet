/**
 * Documents — internal mutations/queries for the unified documents table.
 *
 * Supports all document types (notes, growth content, support threads, etc.)
 * with optional linking to work items, competitors, and leads.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  assignedAgent,
  documentStatus,
  documentType,
  impactLevel,
} from "./schema/validators";

export const createDocument = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: documentType,
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    sourceAgent: v.optional(assignedAgent),
    status: v.optional(documentStatus),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    linkedWorkItemId: v.optional(v.id("autopilotWorkItems")),
    linkedCompetitorId: v.optional(v.id("autopilotCompetitors")),
    linkedLeadId: v.optional(v.id("autopilotLeads")),
    relevanceScore: v.optional(v.number()),
    impactLevel: v.optional(impactLevel),
    sourceUrls: v.optional(v.array(v.string())),
    keyFindings: v.optional(v.array(v.string())),
    platform: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
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
      status: args.status ?? "draft",
      needsReview: args.needsReview ?? false,
      reviewType: args.reviewType,
      linkedWorkItemId: args.linkedWorkItemId,
      linkedCompetitorId: args.linkedCompetitorId,
      linkedLeadId: args.linkedLeadId,
      relevanceScore: args.relevanceScore,
      impactLevel: args.impactLevel,
      sourceUrls: args.sourceUrls,
      keyFindings: args.keyFindings,
      platform: args.platform,
      targetUrl: args.targetUrl,
      metadata: args.metadata,
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
    status: v.optional(documentStatus),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    linkedWorkItemId: v.optional(v.id("autopilotWorkItems")),
    linkedCompetitorId: v.optional(v.id("autopilotCompetitors")),
    linkedLeadId: v.optional(v.id("autopilotLeads")),
    platform: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    publishedUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      return null;
    }

    const { documentId, ...rest } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(documentId, updates);
    return null;
  },
});

export const getDocumentsByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(documentType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const take = args.limit ?? 200;
    if (args.type) {
      const { type } = args;
      return await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .take(take);
    }

    return await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(take);
  },
});

/**
 * Get documents filtered by tags (e.g., "growth-followup").
 * Fetches all org docs and filters in-memory since tags are arrays.
 */
export const getDocumentsByTags = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    tags: v.array(v.string()),
    status: v.optional(documentStatus),
  },
  handler: async (ctx, args) => {
    const docs = args.status
      ? await ctx.db
          .query("autopilotDocuments")
          .withIndex("by_org_status", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq(
                "status",
                args.status as
                  | "draft"
                  | "pending_review"
                  | "published"
                  | "archived"
              )
          )
          .take(200)
      : await ctx.db
          .query("autopilotDocuments")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .take(200);

    return docs.filter((d) => args.tags.every((tag) => d.tags.includes(tag)));
  },
});

/**
 * Get a single document by ID (internal use).
 */
export const getDocumentById = internalQuery({
  args: { documentId: v.id("autopilotDocuments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/**
 * Get documents without verification metadata (for batch verification).
 */
export const getUnverifiedDocuments = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .order("desc")
      .take(50);

    return docs.filter((d) => {
      if (!d.metadata) {
        return true;
      }
      try {
        const meta = JSON.parse(d.metadata);
        return !meta.verificationStatus;
      } catch {
        return true;
      }
    });
  },
});

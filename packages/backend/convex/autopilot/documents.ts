/**
 * Documents — internal mutations/queries for the unified documents table.
 *
 * Supports all document types (notes, growth content, support threads, etc.)
 * with optional linking to work items, competitors, and leads.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { requireOwnedDocumentRelations } from "./ownership";
import { autopilotDocumentRecord } from "./schema/documents.tables";
import {
  assignedAgent,
  documentStatus,
  documentType,
  impactLevel,
} from "./schema/validators";

type DocumentStatus = "archived" | "draft" | "pending_review" | "published";
type DocumentPatch = Partial<
  Pick<
    Doc<"autopilotDocuments">,
    | "content"
    | "linkedCompetitorId"
    | "linkedLeadId"
    | "linkedWorkItemId"
    | "metadata"
    | "needsReview"
    | "platform"
    | "publishedAt"
    | "publishedUrl"
    | "reviewedAt"
    | "reviewType"
    | "status"
    | "tags"
    | "targetUrl"
    | "title"
  >
> & { updatedAt: number };
interface DocumentReviewState {
  needsReview: boolean;
  reviewedAt?: number;
}

function getDocumentReviewState({
  docNeedsReview,
  now,
  status,
}: {
  docNeedsReview: boolean;
  now: number;
  status: DocumentStatus;
}): DocumentReviewState {
  if (status === "pending_review") {
    return { needsReview: true };
  }

  if (status === "published") {
    return { needsReview: false, reviewedAt: now };
  }

  if (status === "archived") {
    if (docNeedsReview) {
      return { needsReview: false, reviewedAt: now };
    }
    return { needsReview: false };
  }

  return { needsReview: false };
}

function applyDocumentContentPatch(
  args: {
    content?: string;
    metadata?: string;
    needsReview?: boolean;
    platform?: string;
    publishedAt?: number;
    publishedUrl?: string;
    reviewedAt?: number;
    reviewType?: string;
    status?: DocumentStatus;
    tags?: string[];
    targetUrl?: string;
    title?: string;
  },
  updates: DocumentPatch
): void {
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
  if (args.needsReview !== undefined) {
    updates.needsReview = args.needsReview;
  }
  if (args.reviewType !== undefined) {
    updates.reviewType = args.reviewType;
  }
  if (args.reviewedAt !== undefined) {
    updates.reviewedAt = args.reviewedAt;
  }
  if (args.platform !== undefined) {
    updates.platform = args.platform;
  }
  if (args.targetUrl !== undefined) {
    updates.targetUrl = args.targetUrl;
  }
  if (args.publishedAt !== undefined) {
    updates.publishedAt = args.publishedAt;
  }
  if (args.publishedUrl !== undefined) {
    updates.publishedUrl = args.publishedUrl;
  }
  if (args.metadata !== undefined) {
    updates.metadata = args.metadata;
  }
}

function applyDocumentRelationPatch(
  args: {
    linkedCompetitorId?: Doc<"autopilotDocuments">["linkedCompetitorId"];
    linkedLeadId?: Doc<"autopilotDocuments">["linkedLeadId"];
    linkedWorkItemId?: Doc<"autopilotDocuments">["linkedWorkItemId"];
  },
  updates: DocumentPatch
): void {
  if (args.linkedWorkItemId !== undefined) {
    updates.linkedWorkItemId = args.linkedWorkItemId;
  }
  if (args.linkedCompetitorId !== undefined) {
    updates.linkedCompetitorId = args.linkedCompetitorId;
  }
  if (args.linkedLeadId !== undefined) {
    updates.linkedLeadId = args.linkedLeadId;
  }
}

function documentHasTags(
  doc: Pick<Doc<"autopilotDocuments">, "tags">,
  tags: string[]
): boolean {
  return tags.every((tag) => doc.tags.includes(tag));
}

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
    await requireOwnedDocumentRelations(ctx, args);

    const now = Date.now();
    const status =
      args.status ?? (args.needsReview ? "pending_review" : "draft");
    const reviewState = getDocumentReviewState({
      docNeedsReview: false,
      now,
      status,
    });
    return await ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      sourceAgent: args.sourceAgent,
      status,
      needsReview: reviewState.needsReview,
      reviewedAt: reviewState.reviewedAt,
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

    const now = Date.now();
    const updates: DocumentPatch = { updatedAt: now };
    await requireOwnedDocumentRelations(ctx, {
      organizationId: doc.organizationId,
      linkedWorkItemId: args.linkedWorkItemId,
      linkedCompetitorId: args.linkedCompetitorId,
      linkedLeadId: args.linkedLeadId,
    });
    applyDocumentContentPatch(args, updates);
    applyDocumentRelationPatch(args, updates);

    if (args.status !== undefined) {
      const reviewState = getDocumentReviewState({
        docNeedsReview: doc.needsReview,
        now,
        status: args.status,
      });
      updates.needsReview = reviewState.needsReview;
      if (reviewState.reviewedAt !== undefined) {
        updates.reviewedAt = reviewState.reviewedAt;
      }
    } else if (args.needsReview === false && doc.needsReview) {
      updates.reviewedAt = now;
    }

    await ctx.db.patch(args.documentId, updates);
    return null;
  },
});

export const getDocumentsByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(documentType),
    limit: v.optional(v.number()),
  },
  returns: v.array(autopilotDocumentRecord),
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
    limit: v.optional(v.number()),
  },
  returns: v.array(autopilotDocumentRecord),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    if (args.status) {
      const { status } = args;
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();

      return docs
        .filter((doc) => documentHasTags(doc, args.tags))
        .slice(0, limit);
    }

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    return docs
      .filter((doc) => documentHasTags(doc, args.tags))
      .slice(0, limit);
  },
});

/**
 * Get a single document by ID (internal use).
 */
export const getDocumentById = internalQuery({
  args: { documentId: v.id("autopilotDocuments") },
  returns: v.union(autopilotDocumentRecord, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/**
 * Get documents without verification metadata (for batch verification).
 */
export const getUnverifiedDocuments = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(autopilotDocumentRecord),
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

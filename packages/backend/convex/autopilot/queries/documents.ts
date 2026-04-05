/**
 * Document queries — unified content library with type/status filters.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { documentStatus, documentType } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listDocuments = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(documentType),
    status: v.optional(documentStatus),
    sourceAgent: v.optional(v.string()),
    needsReview: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 100;

    if (args.needsReview !== undefined) {
      const { needsReview } = args;
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_review", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("needsReview", needsReview)
        )
        .order("desc")
        .take(limit);
      return applyDocFilters(docs, args);
    }

    if (args.type) {
      const { type } = args;
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
      return applyDocFilters(docs, args);
    }

    if (args.status) {
      const { status } = args;
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
      return applyDocFilters(docs, args);
    }

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
    return applyDocFilters(docs, args);
  },
});

export const getDocument = query({
  args: { documentId: v.id("autopilotDocuments") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      return null;
    }

    await requireOrgMembership(ctx, doc.organizationId, user._id);
    return doc;
  },
});

interface DocWithAgent {
  sourceAgent?: string | null;
  status: string;
}

function applyDocFilters<T extends DocWithAgent>(
  docs: T[],
  filters: { sourceAgent?: string; status?: string }
): T[] {
  let result = docs;

  if (filters.sourceAgent) {
    result = result.filter((d) => d.sourceAgent === filters.sourceAgent);
  }

  return result;
}

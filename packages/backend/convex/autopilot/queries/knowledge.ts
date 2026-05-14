/**
 * Knowledge docs queries — public, auth-gated.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

// Legacy entry point kept for backward compatibility with existing UI calls.
// Now backed by the `identity` knowledge doc (the canonical "what is this
// product" surface) after the chain split. New code should call
// `listKnowledgeDocs` and pick the doc by `docType` to access any of the four
// typed docs (identity, brand_voice, feature_catalog, scope).
export const getProductDefinition = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("autopilotKnowledgeDocs"),
      contentFull: v.string(),
      version: v.number(),
      lastUpdatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const doc = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId).eq("docType", "identity")
      )
      .unique();

    if (!doc) {
      return null;
    }

    return {
      _id: doc._id,
      contentFull: doc.contentFull,
      version: doc.version,
      lastUpdatedAt: doc.lastUpdatedAt,
    };
  },
});

export const listKnowledgeDocs = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotKnowledgeDocs"),
      _creationTime: v.number(),
      docType: v.string(),
      title: v.string(),
      contentFull: v.string(),
      contentSummary: v.string(),
      version: v.number(),
      userEdited: v.boolean(),
      lastUpdatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const docs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return docs.map((doc) => ({
      _id: doc._id,
      _creationTime: doc._creationTime,
      docType: doc.docType,
      title: doc.title,
      contentFull: doc.contentFull,
      contentSummary: doc.contentSummary,
      version: doc.version,
      userEdited: doc.userEdited,
      lastUpdatedAt: doc.lastUpdatedAt,
    }));
  },
});

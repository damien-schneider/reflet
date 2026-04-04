/**
 * Document queries — public, auth-gated.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listDocuments = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(v.string()),
    sourceAgent: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 100;

    if (args.type) {
      const { type } = args;
      return ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
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

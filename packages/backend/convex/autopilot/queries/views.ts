/**
 * Saved view queries — list/get user-scoped + shared views.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listViews = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const all = await ctx.db
      .query("userViews")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Personal views: only the owner sees them. Shared: everyone in org.
    return all.filter(
      (view) => view.scope === "shared" || view.userId === user._id
    );
  },
});

export const getView = query({
  args: { viewId: v.id("userViews") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      return null;
    }
    await requireOrgMembership(ctx, view.organizationId, user._id);
    if (view.scope === "personal" && view.userId !== user._id) {
      return null;
    }
    return view;
  },
});

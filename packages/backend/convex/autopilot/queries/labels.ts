/**
 * Work item label queries — list, get, list links.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listLabels = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("workItemLabels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getLabel = query({
  args: {
    labelId: v.id("workItemLabels"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const label = await ctx.db.get(args.labelId);
    if (!label) {
      return null;
    }
    await requireOrgMembership(ctx, label.organizationId, user._id);
    return label;
  },
});

export const listWorkItemLabels = query({
  args: {
    workItemId: v.id("autopilotWorkItems"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return [];
    }
    await requireOrgMembership(ctx, item.organizationId, user._id);

    const links = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.workItemId))
      .collect();

    const labels = await Promise.all(
      links.map((link) => ctx.db.get(link.labelId))
    );
    return labels.filter((label) => label !== null);
  },
});

/**
 * Work item label queries — list, get, list links.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
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

/**
 * Returns every label in the org alongside its current usage count
 * (number of work items linked to it). The labels admin page renders
 * the list with these counts, so we compute them server-side in a
 * single pass over `workItemLabelLinks` rather than fanning out from
 * the client.
 */
export const listLabelsWithCounts = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<Array<Doc<"workItemLabels"> & { usageCount: number }>> => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const labels = await ctx.db
      .query("workItemLabels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const links = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const counts = new Map<Id<"workItemLabels">, number>();
    for (const link of links) {
      counts.set(link.labelId, (counts.get(link.labelId) ?? 0) + 1);
    }

    return labels.map((label) => ({
      ...label,
      usageCount: counts.get(label._id) ?? 0,
    }));
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

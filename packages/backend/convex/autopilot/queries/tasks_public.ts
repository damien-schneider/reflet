/**
 * Public task queries — no auth required.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";

export const listPublicRoadmapTasks = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      _creationTime: v.number(),
      title: v.string(),
      type: v.string(),
      status: v.string(),
      priority: v.string(),
      tags: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_public", (q) =>
        q.eq("organizationId", args.organizationId).eq("isPublicRoadmap", true)
      )
      .order("desc")
      .take(200);

    return items
      .filter((item) => item.status !== "cancelled")
      .map((item) => ({
        _id: item._id,
        _creationTime: item._creationTime,
        title: item.title,
        type: item.type,
        status: item.status,
        priority: item.priority,
        tags: item.tags,
      }));
  },
});

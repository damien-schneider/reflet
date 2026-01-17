import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

/**
 * Get feedback items for the roadmap view
 */
export const getRoadmap = query({
  args: {
    boardId: v.id("boards"),
    includeBacklog: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Only show approved items in the roadmap
    const feedbackItemsRaw = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("isApproved"), true))
      .collect();

    // Map tags for each item
    const feedbackItems = await Promise.all(
      feedbackItemsRaw.map(async (f) => {
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
        );
        return {
          ...f,
          tags: tags.filter(Boolean),
        };
      })
    );

    const backlog = feedbackItems.filter((f) => !f.roadmapLane);
    const inLanes = feedbackItems.filter((f) => !!f.roadmapLane);

    // Grouping by laneId
    const lanesMap = new Map<string, typeof feedbackItems>();
    for (const item of inLanes) {
      if (item.roadmapLane) {
        const existing = lanesMap.get(item.roadmapLane) || [];
        existing.push(item);
        lanesMap.set(item.roadmapLane, existing);
      }
    }

    const lanes = await Promise.all(
      Array.from(lanesMap.entries()).map(async ([laneId, items]) => {
        const lane = await ctx.db.get(laneId as Id<"tags">);
        return {
          lane,
          items,
        };
      })
    );

    return {
      backlog,
      lanes: lanes.filter((l) => !!l.lane),
    };
  },
});

/**
 * Get roadmap items for the entire organization
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Only show approved items in the roadmap
    const feedbackItemsRaw = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isApproved"), true))
      .collect();

    // Add tags
    const feedbackItems = await Promise.all(
      feedbackItemsRaw.map(async (f) => {
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
        );
        return {
          ...f,
          tags: tags.filter(Boolean),
        };
      })
    );

    // Filter by roadmap statuses or having a roadmapLane
    return feedbackItems.filter(
      (f) =>
        ["planned", "in_progress", "completed"].includes(f.status) ||
        !!f.roadmapLane
    );
  },
});

/**
 * Move feedback to a specific roadmap lane
 */
export const roadmapMoveToLane = mutation({
  args: {
    feedbackId: v.id("feedback"),
    laneId: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      throw new Error("Only admins can manage the roadmap");
    }

    const { feedbackId, laneId, order } = args;

    const data: Partial<Doc<"feedback">> = {
      roadmapLane: laneId,
      roadmapOrder: order,
    };

    // If laneId corresponds to a tag, we might want to update status too
    if (laneId) {
      const tag = await ctx.db.get(laneId as Id<"tags">);
      if (tag?.isDoneStatus) {
        data.status = "completed";
      } else if (tag) {
        // If it's a roadmap lane but not done, maybe it's "in_progress" or "planned"
        // For simplicity, we just set it to in_progress if it's not done
        data.status = "in_progress";
      }
    } else {
      // If removed from lane, it's open again
      data.status = "open";
    }

    await ctx.db.patch(feedbackId, {
      ...data,
      updatedAt: Date.now(),
    });

    return feedbackId;
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { feedbackStatus } from "./feedback";
import { getAuthUser } from "./utils";

// Helper to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Tag settings validator
const tagSettings = v.object({
  requireApproval: v.optional(v.boolean()),
  defaultStatus: v.optional(feedbackStatus),
  isPublic: v.optional(v.boolean()),
});

// ============================================
// QUERIES
// ============================================

/**
 * List all tags for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sort by laneOrder for roadmap lanes, then by name
    return tags.sort((a, b) => {
      if (a.isRoadmapLane && b.isRoadmapLane) {
        return (a.laneOrder ?? 0) - (b.laneOrder ?? 0);
      }
      if (a.isRoadmapLane) {
        return -1;
      }
      if (b.isRoadmapLane) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Get a tag by organization and slug (for public pages)
 */
export const getBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    const tag = await ctx.db
      .query("tags")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug)
      )
      .unique();

    if (!tag) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    // Non-members can only see public tags
    if (!(isMember || tag.settings?.isPublic)) {
      return null;
    }

    return tag;
  },
});

/**
 * List public tags for an organization
 */
export const listPublic = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org?.isPublic) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to only public tags
    return tags.filter((tag) => tag.settings?.isPublic);
  },
});

/**
 * Get roadmap lanes (tags configured as lanes)
 */
export const getRoadmapLanes = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isRoadmapLane"), true))
      .collect();

    return tags.sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));
  },
});

/**
 * Get roadmap configuration (lanes for display)
 * Returns { lanes: Tag[] } for compatibility with roadmap page
 */
export const getRoadmapConfig = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isRoadmapLane"), true))
      .collect();

    const lanes = tags.sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));

    return { lanes };
  },
});

/**
 * Get tags for a specific feedback item
 */
export const getForFeedback = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => {
        const tag = await ctx.db.get(ft.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new tag
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.optional(v.string()),
    color: v.string(),
    description: v.optional(v.string()),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
    settings: v.optional(tagSettings),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create tags");
    }

    // Generate or validate slug
    let slug = args.slug ?? generateSlug(args.name);

    // Ensure slug is unique within the organization
    const existingTag = await ctx.db
      .query("tags")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", slug)
      )
      .unique();

    if (existingTag) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Get max lane order if this is a roadmap lane
    let laneOrder: number | undefined;
    if (args.isRoadmapLane) {
      const existingLanes = await ctx.db
        .query("tags")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("isRoadmapLane"), true))
        .collect();

      const maxOrder = existingLanes.reduce(
        (max, lane) => Math.max(max, lane.laneOrder ?? 0),
        0
      );
      laneOrder = maxOrder + 1;
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      organizationId: args.organizationId,
      name: args.name,
      slug,
      color: args.color,
      description: args.description,
      isDoneStatus: args.isDoneStatus ?? false,
      isRoadmapLane: args.isRoadmapLane ?? false,
      laneOrder,
      settings: args.settings,
      createdAt: now,
      updatedAt: now,
    });

    return tagId;
  },
});

/**
 * Update a tag
 */
export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
    settings: v.optional(tagSettings),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update tags");
    }

    // Handle slug uniqueness if changing
    if (args.slug && args.slug !== tag.slug) {
      const newSlug = args.slug;
      const existingTag = await ctx.db
        .query("tags")
        .withIndex("by_org_slug", (q) =>
          q.eq("organizationId", tag.organizationId).eq("slug", newSlug)
        )
        .unique();

      if (existingTag) {
        throw new Error("This slug is already taken in this organization");
      }
    }

    // Handle lane order if becoming a roadmap lane
    const updates: Partial<typeof tag> & { updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.isRoadmapLane && !tag.isRoadmapLane) {
      const existingLanes = await ctx.db
        .query("tags")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", tag.organizationId)
        )
        .filter((q) => q.eq(q.field("isRoadmapLane"), true))
        .collect();

      const maxOrder = existingLanes.reduce(
        (max, lane) => Math.max(max, lane.laneOrder ?? 0),
        0
      );
      updates.laneOrder = maxOrder + 1;
    } else if (args.isRoadmapLane === false && tag.isRoadmapLane) {
      updates.laneOrder = undefined;
    }

    const { id, ...otherUpdates } = args;
    await ctx.db.patch(id, { ...otherUpdates, ...updates });

    return id;
  },
});

/**
 * Reorder roadmap lanes
 */
export const reorderLanes = mutation({
  args: {
    organizationId: v.id("organizations"),
    laneIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can reorder lanes");
    }

    // Update lane orders
    for (let i = 0; i < args.laneIds.length; i++) {
      await ctx.db.patch(args.laneIds[i], { laneOrder: i });
    }

    return true;
  },
});

/**
 * Delete a tag
 */
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete tags");
    }

    // Remove tag from all feedback
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    for (const ft of feedbackTags) {
      await ctx.db.delete(ft._id);
    }

    // Clear roadmapLane on feedback using this tag
    if (tag.isRoadmapLane) {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", tag.organizationId)
        )
        .filter((q) => q.eq(q.field("roadmapLane"), args.id))
        .collect();

      for (const f of feedback) {
        await ctx.db.patch(f._id, { roadmapLane: undefined });
      }
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Add a tag to feedback
 */
export const addToFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Verify tag belongs to same org
    if (tag.organizationId !== feedback.organizationId) {
      throw new Error("Tag does not belong to this organization");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can add tags to feedback");
    }

    // Check if already added
    const existing = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert("feedbackTags", {
      feedbackId: args.feedbackId,
      tagId: args.tagId,
    });

    return id;
  },
});

/**
 * Remove a tag from feedback
 */
export const removeFromFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove tags from feedback");
    }

    const feedbackTag = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (feedbackTag) {
      await ctx.db.delete(feedbackTag._id);
    }

    return true;
  },
});

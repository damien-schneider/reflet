import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const create = mutation({
  args: {
    color: v.string(),
    description: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
    slug: v.optional(v.string()),
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
      slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      color: args.color,
      createdAt: now,
      description: args.description,
      name: args.name,
      organizationId: args.organizationId,
      slug,
      updatedAt: now,
    });

    return tagId;
  },
});

export const update = mutation({
  args: {
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    id: v.id("tags"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
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

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    return id;
  },
});

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

    await ctx.db.delete(args.id);
    return true;
  },
});

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

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthUser } from "../shared/access";

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const create = mutation({
  args: {
    color: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create tags");
    }
    let slug = generateSlug(args.name);
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
      icon: args.icon,
      name: args.name,
      organizationId: args.organizationId,
      settings: { isPublic: args.isPublic ?? false },
      slug,
      updatedAt: now,
    });

    return tagId;
  },
  returns: v.id("tags"),
});

export const update = mutation({
  args: {
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    id: v.id("tags"),
    isPublic: v.optional(v.boolean()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update tags");
    }

    const { id, isPublic, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      ...(isPublic === undefined
        ? {}
        : { settings: { ...tag.settings, isPublic } }),
      updatedAt: Date.now(),
    });

    return id;
  },
  returns: v.id("tags"),
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete tags");
    }
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
  returns: v.boolean(),
});

export const addToFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }
    if (tag.organizationId !== feedback.organizationId) {
      throw new Error("Tag does not belong to this organization");
    }
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can add tags to feedback");
    }
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
  returns: v.id("feedbackTags"),
});

export const removeFromFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
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
  returns: v.boolean(),
});

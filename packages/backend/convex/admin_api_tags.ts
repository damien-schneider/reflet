import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ============================================
// TAG QUERIES
// ============================================

export const listTags = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      id: v.id("tags"),
      name: v.string(),
      slug: v.string(),
      color: v.string(),
      icon: v.optional(v.string()),
      description: v.optional(v.string()),
      isPublic: v.optional(v.boolean()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return tags.map((t) => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      icon: t.icon,
      description: t.description,
      isPublic: t.settings?.isPublic,
      createdAt: t.createdAt,
    }));
  },
});

// ============================================
// TAG MUTATIONS
// ============================================

export const createTag = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.object({ id: v.id("tags") }),
  handler: async (ctx, args) => {
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await ctx.db
      .query("tags")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", slug)
      )
      .unique();
    if (existing) {
      throw new Error(`Tag with slug "${slug}" already exists`);
    }

    const now = Date.now();
    const id = await ctx.db.insert("tags", {
      organizationId: args.organizationId,
      name: args.name,
      slug,
      color: args.color,
      icon: args.icon,
      description: args.description,
      settings: { isPublic: args.isPublic ?? false },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateTag = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.organizationId !== args.organizationId) {
      throw new Error("Tag not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      updates.name = args.name;
      updates.slug = args.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (args.color !== undefined) {
      updates.color = args.color;
    }
    if (args.icon !== undefined) {
      updates.icon = args.icon;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.isPublic !== undefined) {
      updates.settings = { ...tag.settings, isPublic: args.isPublic };
    }

    await ctx.db.patch(args.tagId, updates);
    return { success: true };
  },
});

export const deleteTag = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.id("tags"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.organizationId !== args.organizationId) {
      throw new Error("Tag not found");
    }

    // Remove tag from all feedback
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();
    for (const ft of feedbackTags) {
      await ctx.db.delete(ft._id);
    }

    await ctx.db.delete(args.tagId);
    return { success: true };
  },
});

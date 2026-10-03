import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { isOrgMemberViewer, requireAuthUser } from "../shared/access";
import {
  categoryVisibleToViewer,
  getFeedbackCategories,
} from "./categories/visibility";
import { canViewFeedback } from "./public_projection";

import { DEFAULT_TAGS } from "./tag_definitions";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

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

    return tags
      .filter((tag) => categoryVisibleToViewer(tag, isMember))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

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
      return null;
    }

    return categoryVisibleToViewer(tag, isMember) ? tag : null;
  },
});

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

    return tags
      .filter((tag) => categoryVisibleToViewer(tag, false))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getForFeedback = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return [];
    }
    if (!(await canViewFeedback(ctx, feedback))) {
      return [];
    }
    return getFeedbackCategories(
      ctx,
      args.feedbackId,
      await isOrgMemberViewer(ctx, feedback.organizationId)
    );
  },
});

export const createDefaults = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existingTags) {
      return [];
    }

    const now = Date.now();
    const tagIds: string[] = [];

    for (const tag of DEFAULT_TAGS) {
      const id = await ctx.db.insert("tags", {
        color: tag.color,
        createdAt: now,
        description: tag.description,
        name: tag.name,
        organizationId: args.organizationId,
        slug: tag.slug,
        updatedAt: now,
      });
      tagIds.push(id);
    }

    return tagIds;
  },
});

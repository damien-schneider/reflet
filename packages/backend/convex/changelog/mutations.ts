import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  MAX_CHANGELOG_VERSION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { getAuthUser } from "../shared/utils";
import { validateInputLength } from "../shared/validators";

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new release (draft)
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create releases");
    }

    const now = Date.now();
    const releaseId = await ctx.db.insert("releases", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      version: args.version,
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return releaseId;
  },
});

/**
 * Update a release
 */
export const update = mutation({
  args: {
    id: v.id("releases"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.title !== undefined) {
      validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    }
    if (args.description !== undefined) {
      validateInputLength(
        args.description,
        MAX_DESCRIPTION_LENGTH,
        "Description"
      );
    }
    if (args.version !== undefined) {
      validateInputLength(
        args.version,
        MAX_CHANGELOG_VERSION_LENGTH,
        "Version"
      );
    }

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update releases");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

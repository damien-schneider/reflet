import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { feedbackStatus } from "./feedback";
import { PLAN_LIMITS } from "./organizations";
import { getAuthUser } from "./utils";

// Helper to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// ============================================
// QUERIES
// ============================================

/**
 * List all boards for an organization
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

    // Check access - either member or public org
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

    // Get boards
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter public boards for non-members
    if (!isMember) {
      return boards.filter((board) => board.isPublic);
    }

    return boards;
  },
});

/**
 * Get a board by ID
 */
export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      return null;
    }

    let isMember = false;
    let role: string | null = null;

    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", board.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
      role = membership?.role ?? null;
    }

    // Non-members can only see public boards in public orgs
    if (!(isMember || (board.isPublic && org.isPublic))) {
      return null;
    }

    return {
      ...board,
      organization: org,
      isMember,
      role,
    };
  },
});

/**
 * Get a board by organization slug and board slug
 */
export const getBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    // Get board by org + slug
    const board = await ctx.db
      .query("boards")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug)
      )
      .unique();

    if (!board) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    let isMember = false;
    let role: string | null = null;

    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", org._id).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
      role = membership?.role ?? null;
    }

    // Non-members can only see public boards in public orgs
    if (!(isMember || (board.isPublic && org.isPublic))) {
      return null;
    }

    return {
      ...board,
      organization: org,
      isMember,
      role,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new board
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Get organization to check limits
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check board limit
    const existingBoards = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const limit = PLAN_LIMITS[org.subscriptionTier].maxBoards;
    if (existingBoards.length >= limit) {
      throw new Error(
        `Board limit reached. Your ${org.subscriptionTier} plan allows ${limit} board(s).`
      );
    }

    // Generate or validate slug
    let slug = args.slug || generateSlug(args.name);

    // Ensure slug is unique within the organization
    const existingBoard = await ctx.db
      .query("boards")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", slug)
      )
      .unique();

    if (existingBoard) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const now = Date.now();
    const boardId = await ctx.db.insert("boards", {
      organizationId: args.organizationId,
      name: args.name,
      slug,
      description: args.description,
      isPublic: args.isPublic ?? true,
      settings: {
        allowAnonymousVoting: false,
        requireApproval: false,
        defaultStatus: "open",
      },
      createdAt: now,
      updatedAt: now,
    });

    return boardId;
  },
});

/**
 * Update a board
 */
export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.id);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Validate slug uniqueness if changing
    const newSlug = args.slug;
    if (newSlug && newSlug !== board.slug) {
      const existingBoard = await ctx.db
        .query("boards")
        .withIndex("by_org_slug", (q) =>
          q.eq("organizationId", board.organizationId).eq("slug", newSlug)
        )
        .unique();

      if (existingBoard) {
        throw new Error("This slug is already taken in this organization");
      }
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

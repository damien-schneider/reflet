import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

// Subscription plan limits
export const PLAN_LIMITS = {
  free: {
    maxBoards: 1,
    maxMembers: 3,
    maxFeedbackPerBoard: 100,
    customBranding: false,
    apiAccess: false,
  },
  pro: {
    maxBoards: 5,
    maxMembers: 10,
    maxFeedbackPerBoard: 1000,
    customBranding: true,
    apiAccess: true,
  },
} as const;

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
 * List all organizations the current user is a member of
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all organizations
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) {
          return null;
        }
        return {
          ...org,
          role: membership.role,
        };
      })
    );

    return organizations.filter(Boolean);
  },
});

/**
 * Get a single organization by ID
 */
export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) {
      return null;
    }

    // Check if user has access (member or public org)
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!org.isPublic && user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.id).eq("userId", user._id)
        )
        .unique();

      if (!membership) {
        return null;
      }
      return { ...org, role: membership.role };
    }

    if (org.isPublic) {
      return org;
    }

    return null;
  },
});

/**
 * Get organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!org) {
      return null;
    }

    // Check if user has access
    const user = await authComponent.safeGetAuthUser(ctx);

    if (org.isPublic) {
      // For public orgs, return with role if user is a member
      if (user) {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org_user", (q) =>
            q.eq("organizationId", org._id).eq("userId", user._id)
          )
          .unique();

        if (membership) {
          return { ...org, role: membership.role };
        }
      }
      return { ...org, role: null };
    }

    // Private org - user must be a member
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }
    return { ...org, role: membership.role };
  },
});

// ============================================
// INTERNAL MUTATIONS (for testing and internal use)
// ============================================

/**
 * Internal mutation to create an organization with explicit user ID.
 * This enables testing without authentication mocking.
 */
export const createOrganization = internalMutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate or validate slug
    const slug = args.slug || generateSlug(args.name);

    // Ensure slug is unique - throw error if taken
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingOrg) {
      // Add random suffix
      throw new Error("This slug is already taken");
    }

    const now = Date.now();

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      isPublic: args.isPublic ?? false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: now,
    });

    // Add creator as owner
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId: args.userId,
      role: "owner",
      createdAt: now,
    });

    // Create default statuses (used as roadmap columns)
    const DEFAULT_STATUSES = [
      { name: "Backlog", color: "#6b7280", icon: "clock", order: 0 },
      { name: "Planned", color: "#3b82f6", icon: "calendar", order: 1 },
      { name: "In Progress", color: "#8b5cf6", icon: "spinner", order: 2 },
      { name: "Done", color: "#22c55e", icon: "check-circle", order: 3 },
    ];

    for (const status of DEFAULT_STATUSES) {
      await ctx.db.insert("organizationStatuses", {
        organizationId: orgId,
        name: status.name,
        color: status.color,
        icon: status.icon,
        order: status.order,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create default tags (for categorizing feedback types)
    const DEFAULT_TAGS = [
      {
        name: "Feature Request",
        slug: "feature-request",
        color: "#3b82f6",
        description: "New feature suggestions and ideas",
      },
      {
        name: "Bug Report",
        slug: "bug-report",
        color: "#ef4444",
        description: "Issues and problems to be fixed",
      },
      {
        name: "Enhancement",
        slug: "enhancement",
        color: "#8b5cf6",
        description: "Improvements to existing features",
      },
      {
        name: "Question",
        slug: "question",
        color: "#f59e0b",
        description: "Questions and support requests",
      },
    ];

    for (const tag of DEFAULT_TAGS) {
      await ctx.db.insert("tags", {
        organizationId: orgId,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        description: tag.description,
        isDoneStatus: false,
        isRoadmapLane: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return orgId;
  },
});

/**
 * Internal mutation to update an organization's slug.
 * This enables testing without authentication mocking.
 */
export const updateOrganizationSlug = internalMutation({
  args: {
    id: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate slug uniqueness if changing
    if (args.slug !== org.slug) {
      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();

      if (existingOrg) {
        throw new Error("This slug is already taken");
      }
    }

    await ctx.db.patch(args.id, { slug: args.slug });
    return args.id;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new organization
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Generate or validate slug
    const slug = args.slug || generateSlug(args.name);

    // Ensure slug is unique - throw error if taken
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingOrg) {
      throw new Error("This slug is already taken");
    }

    const now = Date.now();

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      isPublic: args.isPublic ?? false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: now,
    });

    // Add creator as owner
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId: user._id,
      role: "owner",
      createdAt: now,
    });

    // Create default statuses (used as roadmap columns)
    const DEFAULT_STATUSES = [
      { name: "Backlog", color: "#6b7280", icon: "clock", order: 0 },
      { name: "Planned", color: "#3b82f6", icon: "calendar", order: 1 },
      { name: "In Progress", color: "#8b5cf6", icon: "spinner", order: 2 },
      { name: "Done", color: "#22c55e", icon: "check-circle", order: 3 },
    ];

    for (const status of DEFAULT_STATUSES) {
      await ctx.db.insert("organizationStatuses", {
        organizationId: orgId,
        name: status.name,
        color: status.color,
        icon: status.icon,
        order: status.order,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create default tags (for categorizing feedback types)
    const DEFAULT_TAGS = [
      {
        name: "Feature Request",
        slug: "feature-request",
        color: "#3b82f6",
        description: "New feature suggestions and ideas",
      },
      {
        name: "Bug Report",
        slug: "bug-report",
        color: "#ef4444",
        description: "Issues and problems to be fixed",
      },
      {
        name: "Enhancement",
        slug: "enhancement",
        color: "#8b5cf6",
        description: "Improvements to existing features",
      },
      {
        name: "Question",
        slug: "question",
        color: "#f59e0b",
        description: "Questions and support requests",
      },
    ];

    for (const tag of DEFAULT_TAGS) {
      await ctx.db.insert("tags", {
        organizationId: orgId,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        description: tag.description,
        isDoneStatus: false,
        isRoadmapLane: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return orgId;
  },
});

/**
 * Update organization settings
 */
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logo: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    primaryColor: v.optional(v.string()),
    customCss: v.optional(v.string()),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        syncDirection: v.optional(v.string()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
    feedbackSettings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        cardStyle: v.optional(
          v.union(
            v.literal("sweep-corner"),
            v.literal("minimal-notch"),
            v.literal("editorial-feed")
          )
        ),
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(
          v.union(
            v.literal("open"),
            v.literal("under_review"),
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("closed")
          )
        ),
        milestoneStyle: v.optional(
          v.union(
            v.literal("track"),
            v.literal("editorial-accordion"),
            v.literal("dashboard-timeline")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check user has admin or owner role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.id).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to update this organization");
    }

    const org = await ctx.db.get(args.id);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if custom branding is allowed (logo is free for all tiers)
    if (
      (args.primaryColor || args.customCss) &&
      org.subscriptionTier === "free"
    ) {
      throw new Error("Custom branding requires a Pro subscription");
    }

    // Validate slug uniqueness if changing
    const newSlug = args.slug;
    if (newSlug && newSlug !== org.slug) {
      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existingOrg) {
        throw new Error("This slug is already taken");
      }
    }

    // Update organization
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    return id;
  },
});

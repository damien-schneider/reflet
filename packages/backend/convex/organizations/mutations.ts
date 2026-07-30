import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

// Helper to generate slug from name
const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ============================================
// INTERNAL MUTATIONS (for testing and internal use)
// ============================================

/**
 * Internal mutation to create an organization with explicit user ID.
 * This enables testing without authentication mocking.
 */
export const createOrganization = internalMutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug || generateSlug(args.name);

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingOrg) {
      throw new Error("This slug is already taken");
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      createdAt: now,
      isPublic: args.isPublic ?? false,
      name: args.name,
      slug,
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });

    await ctx.db.insert("organizationMembers", {
      createdAt: now,
      organizationId: orgId,
      role: "owner",
      userId: args.userId,
    });

    const DEFAULT_STATUSES = [
      { color: "#6b7280", icon: "clock", name: "Backlog", order: 0 },
      { color: "#3b82f6", icon: "calendar", name: "Planned", order: 1 },
      { color: "#8b5cf6", icon: "spinner", name: "In Progress", order: 2 },
      { color: "#22c55e", icon: "check-circle", name: "Done", order: 3 },
    ];

    for (const status of DEFAULT_STATUSES) {
      await ctx.db.insert("organizationStatuses", {
        color: status.color,
        createdAt: now,
        icon: status.icon,
        name: status.name,
        order: status.order,
        organizationId: orgId,
        updatedAt: now,
      });
    }

    const DEFAULT_TAGS = [
      {
        color: "#3b82f6",
        description: "New feature suggestions and ideas",
        name: "Feature Request",
        slug: "feature-request",
      },
      {
        color: "#ef4444",
        description: "Issues and problems to be fixed",
        name: "Bug Report",
        slug: "bug-report",
      },
      {
        color: "#8b5cf6",
        description: "Improvements to existing features",
        name: "Enhancement",
        slug: "enhancement",
      },
      {
        color: "#f59e0b",
        description: "Questions and support requests",
        name: "Question",
        slug: "question",
      },
    ];

    for (const tag of DEFAULT_TAGS) {
      await ctx.db.insert("tags", {
        color: tag.color,
        createdAt: now,
        description: tag.description,
        isDoneStatus: false,
        isRoadmapLane: false,
        name: tag.name,
        organizationId: orgId,
        slug: tag.slug,
        updatedAt: now,
      });
    }

    return orgId;
  },
});

/**
 * Internal mutation to update an organization's slug.
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
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const slug = args.slug || generateSlug(args.name);

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingOrg) {
      throw new Error("This slug is already taken");
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      createdAt: now,
      isPublic: args.isPublic ?? false,
      name: args.name,
      slug,
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });

    await ctx.db.insert("organizationMembers", {
      createdAt: now,
      organizationId: orgId,
      role: "owner",
      userId: user._id,
    });

    const DEFAULT_STATUSES = [
      { color: "#6b7280", icon: "clock", name: "Backlog", order: 0 },
      { color: "#3b82f6", icon: "calendar", name: "Planned", order: 1 },
      { color: "#8b5cf6", icon: "spinner", name: "In Progress", order: 2 },
      { color: "#22c55e", icon: "check-circle", name: "Done", order: 3 },
    ];

    for (const status of DEFAULT_STATUSES) {
      await ctx.db.insert("organizationStatuses", {
        color: status.color,
        createdAt: now,
        icon: status.icon,
        name: status.name,
        order: status.order,
        organizationId: orgId,
        updatedAt: now,
      });
    }

    const DEFAULT_TAGS = [
      {
        color: "#3b82f6",
        description: "New feature suggestions and ideas",
        name: "Feature Request",
        slug: "feature-request",
      },
      {
        color: "#ef4444",
        description: "Issues and problems to be fixed",
        name: "Bug Report",
        slug: "bug-report",
      },
      {
        color: "#8b5cf6",
        description: "Improvements to existing features",
        name: "Enhancement",
        slug: "enhancement",
      },
      {
        color: "#f59e0b",
        description: "Questions and support requests",
        name: "Question",
        slug: "question",
      },
    ];

    for (const tag of DEFAULT_TAGS) {
      await ctx.db.insert("tags", {
        color: tag.color,
        createdAt: now,
        description: tag.description,
        isDoneStatus: false,
        isRoadmapLane: false,
        name: tag.name,
        organizationId: orgId,
        slug: tag.slug,
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
    customCss: v.optional(v.string()),
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
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        milestoneStyle: v.optional(
          v.union(
            v.literal("track"),
            v.literal("editorial-accordion"),
            v.literal("dashboard-timeline")
          )
        ),
        requireApproval: v.optional(v.boolean()),
      })
    ),
    id: v.id("organizations"),
    isPublic: v.optional(v.boolean()),
    logo: v.optional(v.string()),
    name: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

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

    if (args.primaryColor || args.customCss) {
      const effectiveTier = await ctx.runQuery(
        internal.billing.internal.getOrgEffectiveTier,
        { organizationId: args.id }
      );
      if (effectiveTier !== "pro") {
        throw new Error("Custom branding requires a Pro subscription");
      }
    }

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

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    return id;
  },
});

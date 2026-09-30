import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../_generated/server";
import { versionIncrementValidator } from "../changelog/semver";
import { getAuthUser } from "../shared/utils";
import { assertValidSlug, deriveSlugFromName, slugify } from "./slug";

const DEFAULT_STATUSES = [
  { color: "#6b7280", icon: "clock", name: "Backlog", order: 0 },
  { color: "#3b82f6", icon: "calendar", name: "Planned", order: 1 },
  { color: "#8b5cf6", icon: "spinner", name: "In Progress", order: 2 },
  { color: "#22c55e", icon: "check-circle", name: "Done", order: 3 },
] as const;

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
] as const;

const assertSlugAvailable = async (
  ctx: MutationCtx,
  slug: string
): Promise<void> => {
  assertValidSlug(slug);
  const existingOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existingOrg) {
    throw new Error("This slug is already taken");
  }
};

export const resolveSlugUpdate = async (
  ctx: MutationCtx,
  options: { current: string; requested: string | undefined }
): Promise<string> => {
  const { current, requested } = options;
  if (requested === undefined || requested === current) {
    return current;
  }
  const slug = slugify(requested);
  if (slug !== current) {
    await assertSlugAvailable(ctx, slug);
  }
  return slug;
};

const insertOrganization = async (
  ctx: MutationCtx,
  options: { isPublic?: boolean; name: string; slug?: string; userId: string }
): Promise<Id<"organizations">> => {
  const slug = options.slug
    ? slugify(options.slug)
    : deriveSlugFromName(options.name);
  await assertSlugAvailable(ctx, slug);

  const now = Date.now();
  const organizationId = await ctx.db.insert("organizations", {
    createdAt: now,
    isPublic: options.isPublic ?? false,
    name: options.name,
    slug,
    subscriptionStatus: "none",
    subscriptionTier: "free",
  });

  await ctx.db.insert("organizationMembers", {
    createdAt: now,
    organizationId,
    role: "owner",
    userId: options.userId,
  });

  for (const status of DEFAULT_STATUSES) {
    await ctx.db.insert("organizationStatuses", {
      ...status,
      createdAt: now,
      organizationId,
      updatedAt: now,
    });
  }

  for (const tag of DEFAULT_TAGS) {
    await ctx.db.insert("tags", {
      ...tag,
      createdAt: now,
      isDoneStatus: false,
      isRoadmapLane: false,
      organizationId,
      updatedAt: now,
    });
  }

  return organizationId;
};

export const createOrganization = internalMutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => await insertOrganization(ctx, args),
  returns: v.id("organizations"),
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

    const slug = await resolveSlugUpdate(ctx, {
      current: org.slug,
      requested: args.slug,
    });
    await ctx.db.patch(args.id, { slug });
    return args.id;
  },
  returns: v.id("organizations"),
});

// ============================================
// MUTATIONS
// ============================================

export const create = mutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    return await insertOrganization(ctx, { ...args, userId: user._id });
  },
  returns: v.id("organizations"),
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
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(versionIncrementValidator),
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

    const { id, changelogSettings, feedbackSettings, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      slug: await resolveSlugUpdate(ctx, {
        current: org.slug,
        requested: args.slug,
      }),
      ...(changelogSettings && {
        changelogSettings: { ...org.changelogSettings, ...changelogSettings },
      }),
      ...(feedbackSettings && {
        feedbackSettings: { ...org.feedbackSettings, ...feedbackSettings },
      }),
    });

    return id;
  },
});

import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { versionIncrementValidator } from "../changelog/semver";
import { DEFAULT_TAGS } from "../feedback/tag_definitions";
import { requireAuthUser } from "../shared/access";
import { assertValidSlug, deriveSlugFromName, slugify } from "./slug";
import { DEFAULT_STATUSES } from "./status_definitions";

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
) => {
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
      organizationId,
      updatedAt: now,
    });
  }

  return { id: organizationId, slug };
};

export const createOrganization = internalMutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => (await insertOrganization(ctx, args)).id,
  returns: v.id("organizations"),
});

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

export const create = mutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    return await insertOrganization(ctx, { ...args, userId: user._id });
  },
  returns: v.object({ id: v.id("organizations"), slug: v.string() }),
});

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
    const user = await requireAuthUser(ctx);

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
      const tier = await getOrgTier(ctx, args.id);
      if (tier !== "pro") {
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

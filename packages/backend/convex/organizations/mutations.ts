import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { versionIncrementValidator } from "../changelog/semver";
import { DEFAULT_TAGS } from "../feedback/tag_definitions";
import { requireAuthUser } from "../shared/access";
import { MAX_GIT_BRANCH_LENGTH, MAX_TITLE_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { assertValidSlug, deriveSlugFromName, slugify } from "./slug";
import { DEFAULT_STATUSES } from "./status_definitions";
import { logVisibilityChange } from "./visibility_log";

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

// Branch names reach GitHub as URL path segments; `..`, spaces and control characters never belong in one.
const GIT_BRANCH_PATTERN = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const assertValidGitBranch = (branch: string | undefined): void => {
  if (branch === undefined) {
    return;
  }
  validateInputLength(branch, MAX_GIT_BRANCH_LENGTH, "Target branch");
  if (!GIT_BRANCH_PATTERN.test(branch)) {
    throw new Error("Target branch is not a valid git branch name");
  }
};

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
    feedbackSettings: v.optional(
      v.object({
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
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
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

    validateInputLength(args.name, MAX_TITLE_LENGTH, "Name");
    assertValidGitBranch(args.changelogSettings?.targetBranch);

    const org = await ctx.db.get(args.id);
    if (!org) {
      throw new Error("Organization not found");
    }

    if (args.primaryColor) {
      const tier = await getOrgTier(ctx, args.id);
      if (tier !== "pro") {
        throw new Error("Custom branding requires a Pro subscription");
      }
    }

    await logVisibilityChange(ctx, {
      actorId: user._id,
      isPublic: args.isPublic,
      organization: org,
    });
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

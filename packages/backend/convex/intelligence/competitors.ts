import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { MAX_TITLE_LENGTH } from "../shared/constants";
import { assertPublicHttpUrl } from "../shared/outbound/public_fetch";
import { rateLimiter } from "../shared/rate_limits";
import { validateInputLength } from "../shared/validators";

const MAX_COMPETITORS_PER_ORG = 20;
const MAX_COMPETITOR_DESCRIPTION_LENGTH = 2000;

const validateUrl = (url: string): string => assertPublicHttpUrl(url).href;

/**
 * List all competitors for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return competitors.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Add a new competitor
 */
export const create = mutation({
  args: {
    changelogUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    featuresUrl: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
    pricingUrl: v.optional(v.string()),
    websiteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can add competitors");
    }

    validateInputLength(args.name, MAX_TITLE_LENGTH, "Name");
    validateInputLength(
      args.description,
      MAX_COMPETITOR_DESCRIPTION_LENGTH,
      "Description"
    );

    const websiteUrl = validateUrl(args.websiteUrl);

    const changelogUrl = args.changelogUrl
      ? validateUrl(args.changelogUrl)
      : undefined;
    const pricingUrl = args.pricingUrl
      ? validateUrl(args.pricingUrl)
      : undefined;
    const docsUrl = args.docsUrl ? validateUrl(args.docsUrl) : undefined;
    const featuresUrl = args.featuresUrl
      ? validateUrl(args.featuresUrl)
      : undefined;

    const existing = await ctx.db
      .query("competitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(MAX_COMPETITORS_PER_ORG);
    if (existing.length >= MAX_COMPETITORS_PER_ORG) {
      throw new Error(
        `You can track up to ${MAX_COMPETITORS_PER_ORG} competitors. Remove one to add another.`
      );
    }

    await rateLimiter.limit(ctx, "competitorScrapePerOrg", {
      key: args.organizationId,
      throws: true,
    });

    const now = Date.now();

    const competitorId = await ctx.db.insert("competitors", {
      changelogUrl,
      createdAt: now,
      description: args.description,
      docsUrl,
      featuresUrl,
      name: args.name,
      organizationId: args.organizationId,
      pricingUrl,
      status: "active",
      updatedAt: now,
      websiteUrl,
    });

    // Schedule a scrape
    await ctx.scheduler.runAfter(
      0,
      internal.intelligence.competitor_scrape_action.scrapeCompetitor,
      { competitorId }
    );

    return competitorId;
  },
});

/**
 * Delete a competitor and related battlecards
 */
export const remove = mutation({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      throw new Error("Competitor not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove competitors");
    }

    // Delete related battlecards
    const battlecards = await ctx.db
      .query("battlecards")
      .withIndex("by_competitor", (q) => q.eq("competitorId", args.id))
      .collect();

    for (const battlecard of battlecards) {
      await ctx.db.delete(battlecard._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

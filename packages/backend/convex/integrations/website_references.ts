import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { assertPublicHttpUrl } from "../shared/outbound/public_fetch";

const TRAILING_SLASH_REGEX = /\/$/;

// ============================================
// QUERIES
// ============================================

/**
 * List all website references for an organization
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

    const references = await ctx.db
      .query("websiteReferences")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return references;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Add a new website reference
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    url: v.string(),
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
      throw new Error("Only admins can add website references");
    }

    const parsedUrl = assertPublicHttpUrl(args.url);

    // Normalize URL (remove trailing slash, etc.)
    const normalizedUrl =
      parsedUrl.origin + parsedUrl.pathname.replace(TRAILING_SLASH_REGEX, "");

    // Check for duplicates
    const existing = await ctx.db
      .query("websiteReferences")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("url"), normalizedUrl))
      .first();

    if (existing) {
      throw new Error("This URL has already been added");
    }

    const now = Date.now();

    // Create the reference
    const referenceId = await ctx.db.insert("websiteReferences", {
      createdAt: now,
      organizationId: args.organizationId,
      status: "pending",
      updatedAt: now,
      url: normalizedUrl,
    });

    // Schedule scraping
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.website_reference_scrape.scrapeWebsite,
      {
        referenceId,
      }
    );

    return referenceId;
  },
});

/**
 * Remove a website reference
 */
export const remove = mutation({
  args: { id: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const reference = await ctx.db.get(args.id);
    if (!reference) {
      throw new Error("Website reference not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", reference.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove website references");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Refresh a website reference (re-scrape)
 */
export const refresh = mutation({
  args: { id: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const reference = await ctx.db.get(args.id);
    if (!reference) {
      throw new Error("Website reference not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", reference.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can refresh website references");
    }

    // Update status to fetching
    await ctx.db.patch(args.id, {
      status: "fetching",
      updatedAt: Date.now(),
    });

    // Schedule scraping
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.website_reference_scrape.scrapeWebsite,
      {
        referenceId: args.id,
      }
    );

    return true;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Update reference status
 */
export const updateStatus = internalMutation({
  args: {
    description: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    id: v.id("websiteReferences"),
    scrapedContent: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("success"),
      v.literal("error")
    ),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(id, {
      status,
      ...updates,
      updatedAt: now,
      ...(status === "success" ? { lastFetchedAt: now } : {}),
    });
  },
});

/**
 * Internal query to get a reference
 */
export const getReference = internalQuery({
  args: { id: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    const reference = await ctx.db.get(args.id);
    return reference;
  },
});

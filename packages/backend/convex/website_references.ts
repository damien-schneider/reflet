import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUser } from "./utils";

// Top-level regex patterns
const TRAILING_SLASH_REGEX = /\/$/;
const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
const META_DESC_REGEX =
  /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i;
const SCRIPT_TAG_REGEX = /<script[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

// ============================================
// QUERIES
// ============================================

/**
 * List all website references for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

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
    const user = await getAuthUser(ctx);

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

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(args.url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("URL must use http or https protocol");
      }
    } catch {
      throw new Error("Invalid URL format");
    }

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
      organizationId: args.organizationId,
      url: normalizedUrl,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule scraping
    await ctx.scheduler.runAfter(0, internal.website_references.scrapeWebsite, {
      referenceId,
    });

    return referenceId;
  },
});

/**
 * Remove a website reference
 */
export const remove = mutation({
  args: { id: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

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
    const user = await getAuthUser(ctx);

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
    await ctx.scheduler.runAfter(0, internal.website_references.scrapeWebsite, {
      referenceId: args.id,
    });

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
    id: v.id("websiteReferences"),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("success"),
      v.literal("error")
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scrapedContent: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
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

// ============================================
// ACTIONS
// ============================================

/**
 * Scrape a website and extract content
 */
export const scrapeWebsite = internalAction({
  args: { referenceId: v.id("websiteReferences") },
  handler: async (ctx, args) => {
    // Get the reference
    const reference = await ctx.runQuery(
      internal.website_references.getReference,
      { id: args.referenceId }
    );

    if (!reference) {
      return;
    }

    // Update status to fetching
    await ctx.runMutation(internal.website_references.updateStatus, {
      id: args.referenceId,
      status: "fetching",
    });

    try {
      // Fetch the webpage
      const response = await fetch(reference.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.app)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(TITLE_REGEX);
      const title = titleMatch?.[1]?.trim() || undefined;

      // Extract meta description
      const descMatch = html.match(META_DESC_REGEX);
      const description = descMatch?.[1]?.trim() || undefined;

      // Extract main content (simplified)
      let content = html
        // Remove scripts and styles
        .replace(SCRIPT_TAG_REGEX, "")
        .replace(STYLE_TAG_REGEX, "")
        // Remove HTML tags
        .replace(HTML_TAG_REGEX, " ")
        // Decode HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        // Clean up whitespace
        .replace(/\s+/g, " ")
        .trim();

      // Limit content length
      const maxLength = 5000;
      if (content.length > maxLength) {
        content = `${content.slice(0, maxLength)}...`;
      }

      // Save the results
      await ctx.runMutation(internal.website_references.updateStatus, {
        id: args.referenceId,
        status: "success",
        title,
        description,
        scrapedContent: content,
      });
    } catch (error) {
      await ctx.runMutation(internal.website_references.updateStatus, {
        id: args.referenceId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
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

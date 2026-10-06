import { type Infer, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { validateInputLength } from "../shared/validators";
import type { keywordSource } from "./tableFields";

const MAX_KEYWORDS_PER_ORG = 50;
const MAX_KEYWORD_LENGTH = 100;
const MAX_SUBREDDIT_LENGTH = 50;

/**
 * List all keywords for an organization
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

    const keywords = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return keywords.sort((a, b) => a.keyword.localeCompare(b.keyword));
  },
});

export interface KeywordIdentity {
  keyword: string;
  source: Infer<typeof keywordSource>;
  subreddit?: string;
}

export const isSameKeyword = (a: KeywordIdentity, b: KeywordIdentity) =>
  a.keyword === b.keyword &&
  a.source === b.source &&
  a.subreddit === b.subreddit;

export const insertKeyword = async (
  ctx: MutationCtx,
  args: {
    keyword: string;
    organizationId: Id<"organizations">;
    source: Infer<typeof keywordSource>;
    subreddit?: string;
  }
): Promise<Id<"intelligenceKeywords">> => {
  const keyword = args.keyword.trim();
  const subreddit = args.subreddit?.trim() || undefined;
  validateInputLength(keyword, MAX_KEYWORD_LENGTH, "Keyword");
  validateInputLength(subreddit, MAX_SUBREDDIT_LENGTH, "Subreddit");

  const existing = await ctx.db
    .query("intelligenceKeywords")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();

  if (existing.length >= MAX_KEYWORDS_PER_ORG) {
    throw new Error(
      `You can track up to ${MAX_KEYWORDS_PER_ORG} keywords. Remove one to add another.`
    );
  }

  const candidate = { keyword, source: args.source, subreddit };
  if (existing.some((k) => isSameKeyword(k, candidate))) {
    throw new Error(
      "This keyword already exists with the same source and subreddit"
    );
  }

  return await ctx.db.insert("intelligenceKeywords", {
    createdAt: Date.now(),
    keyword,
    organizationId: args.organizationId,
    source: args.source,
    subreddit,
  });
};

/**
 * Add a new keyword
 */
export const create = mutation({
  args: {
    keyword: v.string(),
    organizationId: v.id("organizations"),
    source: v.union(v.literal("reddit"), v.literal("web"), v.literal("both")),
    subreddit: v.optional(v.string()),
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
      throw new Error("Only admins can add keywords");
    }

    return await insertKeyword(ctx, args);
  },
});

/**
 * Delete a keyword by ID
 */
export const remove = mutation({
  args: { id: v.id("intelligenceKeywords") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const keyword = await ctx.db.get(args.id);
    if (!keyword) {
      throw new Error("Keyword not found");
    }

    // Check admin permission and verify org ownership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", keyword.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove keywords");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

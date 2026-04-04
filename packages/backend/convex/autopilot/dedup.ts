/**
 * Deduplication helpers — prevent agents from creating duplicate work.
 *
 * Agents must check before creating tasks or inbox items to avoid
 * flooding the user with redundant items.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { inboxItemType } from "./schema/validators";

// ============================================
// SIMILARITY THRESHOLD
// ============================================

const TITLE_SIMILARITY_THRESHOLD = 0.75;

// ============================================
// STRING SIMILARITY (Jaccard on bigrams)
// ============================================

const getBigrams = (str: string): Set<string> => {
  const normalized = str.toLowerCase().trim();
  const bigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2));
  }
  return bigrams;
};

const jaccardSimilarity = (a: string, b: string): number => {
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  if (bigramsA.size === 0 && bigramsB.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

// ============================================
// TASK DEDUPLICATION
// ============================================

/**
 * Check if a similar task already exists for this organization.
 * Returns the existing task ID if found, null if safe to create.
 */
export const findSimilarTask = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    agent: v.optional(v.string()),
  },
  returns: v.union(v.id("autopilotTasks"), v.null()),
  handler: async (ctx, args) => {
    const existingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Only check against active tasks (not completed/cancelled)
    const activeTasks = existingTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

    for (const task of activeTasks) {
      const similarity = jaccardSimilarity(args.title, task.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        return task._id;
      }
    }

    return null;
  },
});

/**
 * Check if a similar inbox item already exists (pending/snoozed).
 * Returns the existing inbox item ID if found, null if safe to create.
 */
export const findSimilarInboxItem = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    type: inboxItemType,
  },
  returns: v.union(v.id("autopilotInboxItems"), v.null()),
  handler: async (ctx, args) => {
    const existingItems = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.type)
      )
      .collect();

    // Only check pending/snoozed items — already reviewed items are fine to recreate
    const activeItems = existingItems.filter(
      (item) => item.status === "pending" || item.status === "snoozed"
    );

    for (const item of activeItems) {
      const similarity = jaccardSimilarity(args.title, item.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        return item._id;
      }
    }

    return null;
  },
});

/**
 * Check if a growth item with similar title already exists.
 */
export const findSimilarGrowthItem = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  returns: v.union(v.id("autopilotGrowthItems"), v.null()),
  handler: async (ctx, args) => {
    const existingItems = await ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeItems = existingItems.filter(
      (item) => item.status !== "rejected"
    );

    for (const item of activeItems) {
      const similarity = jaccardSimilarity(args.title, item.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        return item._id;
      }
    }

    return null;
  },
});

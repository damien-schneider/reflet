/**
 * Deduplication helpers — prevent agents from creating duplicate work.
 *
 * Agents must check before creating tasks or inbox items to avoid
 * flooding the user with redundant items.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { documentType } from "./schema/validators";

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
  returns: v.union(v.id("autopilotWorkItems"), v.null()),
  handler: async (ctx, args) => {
    const existingItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(500);

    const activeItems = existingItems.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
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
 * Check if a similar document already exists (draft/pending_review).
 * Returns the existing document ID if found, null if safe to create.
 */
export const findSimilarInboxItem = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    type: documentType,
  },
  returns: v.union(v.id("autopilotDocuments"), v.null()),
  handler: async (ctx, args) => {
    const existingDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.type)
      )
      .take(500);

    const activeDocs = existingDocs.filter(
      (doc) => doc.status === "draft" || doc.status === "pending_review"
    );

    for (const doc of activeDocs) {
      const similarity = jaccardSimilarity(args.title, doc.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        return doc._id;
      }
    }

    return null;
  },
});

/**
 * Check if a document with similar title already exists.
 */
export const findSimilarGrowthItem = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  returns: v.union(v.id("autopilotDocuments"), v.null()),
  handler: async (ctx, args) => {
    const existingDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(500);

    const activeDocs = existingDocs.filter((doc) => doc.status !== "archived");

    for (const doc of activeDocs) {
      const similarity = jaccardSimilarity(args.title, doc.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        return doc._id;
      }
    }

    return null;
  },
});

/**
 * Batch check: given an array of titles, return which ones already have
 * similar documents. Returns a map of title → existing doc ID (or null).
 * Reduces N individual dedup queries to a single query + in-memory check.
 */
export const findSimilarGrowthItems = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    titles: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      title: v.string(),
      existingId: v.union(v.id("autopilotDocuments"), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const existingDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(500);

    const activeDocs = existingDocs.filter((doc) => doc.status !== "archived");

    return args.titles.map((title) => {
      for (const doc of activeDocs) {
        const similarity = jaccardSimilarity(title, doc.title);
        if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
          return { title, existingId: doc._id };
        }
      }
      return { title, existingId: null };
    });
  },
});

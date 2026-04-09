/**
 * Deduplication helpers — prevent agents from creating duplicate work.
 *
 * Uses a hybrid similarity approach combining:
 * 1. Normalized token overlap (word-level Jaccard)
 * 2. Character bigram similarity (catches typos/rewordings)
 * 3. Prefix matching (catches "Implement X" vs "Implement X for Y")
 *
 * The combined score catches near-duplicates that bigram-only misses:
 * - "Implement dark mode for dashboard" vs "Add dark mode to the dashboard" → high match
 * - "Fix login bug" vs "Fix login bug on mobile" → high match
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const NON_ALPHANUM_REGEX = /[^a-z0-9\s]/g;
const WHITESPACE_SPLIT_REGEX = /\s+/;

import { documentType } from "./schema/validators";

// ============================================
// SIMILARITY THRESHOLD
// ============================================

const SIMILARITY_THRESHOLD = 0.6;

// ============================================
// STOP WORDS (filtered from token comparison)
// ============================================

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "this",
  "that",
  "be",
  "as",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "not",
  "no",
]);

// ============================================
// HYBRID SIMILARITY
// ============================================

const tokenize = (str: string): string[] =>
  str
    .toLowerCase()
    .replace(NON_ALPHANUM_REGEX, " ")
    .split(WHITESPACE_SPLIT_REGEX)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

const getBigrams = (str: string): Set<string> => {
  const normalized = str.toLowerCase().trim();
  const bigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2));
  }
  return bigrams;
};

const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Hybrid similarity combining token overlap (semantic) and bigram similarity (structural).
 * Catches both rewording ("implement" vs "add") and substring variations.
 */
const hybridSimilarity = (a: string, b: string): number => {
  // Token-level Jaccard (catches "dark mode dashboard" vs "dark mode for the dashboard")
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  const tokenSim = jaccardSimilarity(tokensA, tokensB);

  // Character bigram Jaccard (catches typos, slightly different phrasing)
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  const bigramSim = jaccardSimilarity(bigramsA, bigramsB);

  // Containment check: if one title is a substring of the other (prefix matching)
  const normalA = a.toLowerCase().trim();
  const normalB = b.toLowerCase().trim();
  const containment =
    normalA.includes(normalB) || normalB.includes(normalA) ? 1 : 0;

  // Weighted combination: tokens matter most (semantic), bigrams catch structure
  const TOKEN_WEIGHT = 0.5;
  const BIGRAM_WEIGHT = 0.3;
  const CONTAINMENT_WEIGHT = 0.2;

  return (
    tokenSim * TOKEN_WEIGHT +
    bigramSim * BIGRAM_WEIGHT +
    containment * CONTAINMENT_WEIGHT
  );
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
      const similarity = hybridSimilarity(args.title, item.title);
      if (similarity >= SIMILARITY_THRESHOLD) {
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
      const similarity = hybridSimilarity(args.title, doc.title);
      if (similarity >= SIMILARITY_THRESHOLD) {
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
      const similarity = hybridSimilarity(args.title, doc.title);
      if (similarity >= SIMILARITY_THRESHOLD) {
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
        const similarity = hybridSimilarity(title, doc.title);
        if (similarity >= SIMILARITY_THRESHOLD) {
          return { title, existingId: doc._id };
        }
      }
      return { title, existingId: null };
    });
  },
});

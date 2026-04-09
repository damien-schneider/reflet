/**
 * Content Quality — pre-review quality scoring for agent-generated documents.
 *
 * Scores content before it reaches the president's review queue.
 * Low-quality content is flagged or auto-rejected to reduce review noise.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const MIN_CONTENT_LENGTH = 200;
const MIN_TITLE_LENGTH = 10;
const MIN_QUALITY_SCORE = 0.4;
const SENTENCE_SPLIT_REGEX = /[.!?]+/;

// ============================================
// QUERIES
// ============================================

export const getPendingReviewDocuments = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotDocuments"),
      type: v.string(),
      title: v.string(),
      contentLength: v.number(),
      sourceAgent: v.optional(v.string()),
      qualityScore: v.number(),
      qualityFlags: v.array(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    return docs
      .filter((d) => d.status === "pending_review")
      .slice(0, limit)
      .map((d) => {
        const { score, flags } = scoreContent(d.title, d.content, d.type);
        return {
          _id: d._id,
          type: d.type,
          title: d.title,
          contentLength: d.content.length,
          sourceAgent: d.sourceAgent ?? undefined,
          qualityScore: score,
          qualityFlags: flags,
          createdAt: d.createdAt,
        };
      });
  },
});

// ============================================
// MUTATIONS
// ============================================

export const autoRejectLowQuality = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    const pendingDocs = docs.filter((d) => d.status === "pending_review");
    let rejectedCount = 0;

    for (const doc of pendingDocs) {
      const { score } = scoreContent(doc.title, doc.content, doc.type);

      if (score < MIN_QUALITY_SCORE) {
        await ctx.db.patch(doc._id, {
          status: "archived",
          metadata: JSON.stringify({
            ...safeParseMetadata(doc.metadata),
            autoRejected: true,
            qualityScore: score,
            rejectedAt: Date.now(),
          }),
        });
        rejectedCount++;
      }
    }

    return rejectedCount;
  },
});

// ============================================
// SCORING LOGIC
// ============================================

function scoreContent(
  title: string,
  content: string,
  type: string
): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 1.0;

  // Title quality
  if (title.length < MIN_TITLE_LENGTH) {
    flags.push("title_too_short");
    score -= 0.2;
  }

  if (title === title.toUpperCase()) {
    flags.push("title_all_caps");
    score -= 0.1;
  }

  // Content quality
  if (content.length < MIN_CONTENT_LENGTH) {
    flags.push("content_too_short");
    score -= 0.3;
  }

  // Check for placeholder/template content
  const placeholderPatterns = [
    "[INSERT",
    "[TODO",
    "[PLACEHOLDER",
    "Lorem ipsum",
    "{{",
    "REPLACE THIS",
  ];

  for (const pattern of placeholderPatterns) {
    if (content.includes(pattern)) {
      flags.push("contains_placeholder");
      score -= 0.3;
      break;
    }
  }

  // Check for excessive repetition (same sentence repeated)
  const sentences = content
    .split(SENTENCE_SPLIT_REGEX)
    .filter((s) => s.trim().length > 20);
  if (sentences.length > 3) {
    const uniqueSentences = new Set(
      sentences.map((s) => s.trim().toLowerCase())
    );
    const repetitionRatio = uniqueSentences.size / sentences.length;
    if (repetitionRatio < 0.6) {
      flags.push("excessive_repetition");
      score -= 0.25;
    }
  }

  // Type-specific checks
  if (type === "blog_post" && content.length < 500) {
    flags.push("blog_post_too_short");
    score -= 0.15;
  }

  if (
    (type === "linkedin_post" || type === "twitter_post") &&
    content.length > 3000
  ) {
    flags.push("social_post_too_long");
    score -= 0.1;
  }

  // Check for key findings in research
  if (
    type === "market_research" &&
    !content.includes("finding") &&
    !(
      content.toLowerCase().includes("insight") ||
      content.toLowerCase().includes("trend") ||
      content.toLowerCase().includes("conclusion")
    )
  ) {
    flags.push("research_lacks_findings");
    score -= 0.15;
  }

  return { score: Math.max(0, Math.min(1, score)), flags };
}

function safeParseMetadata(
  metadata: string | undefined
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

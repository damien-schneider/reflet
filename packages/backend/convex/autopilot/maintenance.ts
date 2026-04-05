/**
 * Maintenance — periodic cleanup routines for the autopilot system.
 *
 * Handles document review expiration, stale document cleanup,
 * and knowledge staleness checks.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const REVIEW_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================
// REVIEW EXPIRATION
// ============================================

/**
 * Expire documents and work items that have been waiting for review too long.
 */
export const runReviewExpiration = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const configs = await ctx.db.query("autopilotConfig").collect();

    for (const config of configs) {
      // Expire work items pending review
      const reviewWorkItems = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_review", (q) =>
          q.eq("organizationId", config.organizationId).eq("needsReview", true)
        )
        .collect();

      for (const item of reviewWorkItems) {
        const expiresAt = item.createdAt + REVIEW_EXPIRY_MS;
        if (now > expiresAt) {
          await ctx.db.patch(item._id, {
            needsReview: false,
            reviewedAt: now,
            updatedAt: now,
          });
        }
      }

      // Expire documents pending review
      const reviewDocs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_review", (q) =>
          q.eq("organizationId", config.organizationId).eq("needsReview", true)
        )
        .collect();

      for (const doc of reviewDocs) {
        const expiresAt = doc.createdAt + REVIEW_EXPIRY_MS;
        if (now > expiresAt) {
          await ctx.db.patch(doc._id, {
            needsReview: false,
            reviewedAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return null;
  },
});

// ============================================
// KNOWLEDGE STALENESS CHECK
// ============================================

export const runKnowledgeStalenessCheck = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const configs = await ctx.db.query("autopilotConfig").collect();

    for (const config of configs) {
      if ((config.autonomyMode ?? "supervised") === "stopped") {
        continue;
      }

      const docs = await ctx.db
        .query("autopilotKnowledgeDocs")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", config.organizationId)
        )
        .collect();

      for (const doc of docs) {
        const staleThresholdMs = doc.stalenessAlertDays * 24 * 60 * 60 * 1000;
        const isStale = now - doc.lastUpdatedAt > staleThresholdMs;

        if (isStale) {
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: config.organizationId,
            agent: "system",
            level: "warning",
            message: `Knowledge doc "${doc.title}" (${doc.docType}) is stale — last updated ${doc.stalenessAlertDays}+ days ago`,
            action: "knowledge.stale",
          });
        }
      }
    }

    return null;
  },
});

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
const ACTIVITY_LOG_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DOCUMENT_ARCHIVE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const CLEANUP_BATCH_SIZE = 100;

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
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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

// ============================================
// ACTIVITY LOG CLEANUP
// ============================================

/**
 * Delete activity log entries older than 30 days.
 * Runs in batches to avoid hitting Convex mutation limits.
 */
export const cleanupOldActivityLogs = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - ACTIVITY_LOG_TTL_MS;
    const oldLogs = await ctx.db
      .query("autopilotActivityLog")
      .order("asc")
      .take(CLEANUP_BATCH_SIZE);

    let deleted = 0;
    for (const log of oldLogs) {
      if (log.createdAt < cutoff) {
        await ctx.db.delete(log._id);
        deleted++;
      } else {
        // Logs are ordered by creation time; once we hit a recent one, stop
        break;
      }
    }

    return deleted;
  },
});

// ============================================
// DOCUMENT ARCHIVAL
// ============================================

/**
 * Archive old documents that are in draft/published status and older than 60 days.
 * Archived documents are excluded from agent context queries.
 */
export const archiveStaleDocuments = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - DOCUMENT_ARCHIVE_TTL_MS;
    const configs = await ctx.db.query("autopilotConfig").collect();
    let archived = 0;

    for (const config of configs) {
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", config.organizationId)
        )
        .take(CLEANUP_BATCH_SIZE);

      for (const doc of docs) {
        if (
          doc.createdAt < cutoff &&
          (doc.status === "draft" || doc.status === "published") &&
          !doc.needsReview
        ) {
          await ctx.db.patch(doc._id, {
            status: "archived",
            updatedAt: Date.now(),
          });
          archived++;
        }
      }
    }

    return archived;
  },
});

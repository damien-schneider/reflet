/**
 * Maintenance — periodic cleanup routines for the autopilot system.
 *
 * Handles inbox expiration, note cleanup, and knowledge staleness checks.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

const INBOX_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================
// INBOX EXPIRATION
// ============================================

export const runInboxExpiration = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const configs = await ctx.db.query("autopilotConfig").collect();

    for (const config of configs) {
      const pendingItems = await ctx.db
        .query("autopilotInboxItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", config.organizationId).eq("status", "pending")
        )
        .collect();

      for (const item of pendingItems) {
        const expiresAt = item.expiresAt ?? item.createdAt + INBOX_EXPIRY_MS;
        if (now > expiresAt) {
          await ctx.db.patch(item._id, {
            status: "expired",
            reviewedAt: now,
          });
        }
      }
    }

    return null;
  },
});

// ============================================
// NOTE CLEANUP
// ============================================

export const runNoteCleanup = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const configs = await ctx.runQuery(
      internal.autopilot.config.getEnabledConfigs,
      {}
    );

    for (const config of configs) {
      await ctx.runMutation(internal.autopilot.notes.cleanupNotes, {
        organizationId: config.organizationId,
      });
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
          // Check if we already have a pending inbox item for this doc
          const existingAlert = await ctx.db
            .query("autopilotInboxItems")
            .withIndex("by_org_status", (q) =>
              q
                .eq("organizationId", config.organizationId)
                .eq("status", "pending")
            )
            .collect();

          const alreadyAlerted = existingAlert.some(
            (item) =>
              item.type === "knowledge_update" &&
              item.title.includes(doc.docType)
          );

          if (!alreadyAlerted) {
            await ctx.db.insert("autopilotInboxItems", {
              organizationId: config.organizationId,
              type: "knowledge_update",
              title: `Knowledge doc "${doc.title}" is stale`,
              summary: `The ${doc.docType} doc hasn't been updated in ${doc.stalenessAlertDays}+ days. Last updated: ${new Date(doc.lastUpdatedAt).toISOString()}`,
              status: "pending",
              priority: "low",
              sourceAgent: "system",
              createdAt: now,
            });
          }
        }
      }
    }

    return null;
  },
});

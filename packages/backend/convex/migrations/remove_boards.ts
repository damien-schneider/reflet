import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Migration: Remove Boards - Replace with Enhanced Tags
 *
 * This migration:
 * 1. Creates organization-level statuses from first board's statuses
 * 2. Maps feedback board statuses to organization statuses
 * 3. Migrates external users to use organizationId
 * 4. Creates organization API keys from board API keys
 *
 * Run in order:
 * 1. migrateOrganizationStatuses
 * 2. migrateFeedbackStatuses
 * 3. migrateExternalUsers
 * 4. migrateApiKeys
 *
 * Or run: runFullMigration for all steps
 */

// Default statuses if organization has no boards
const DEFAULT_STATUSES = [
  { name: "New", color: "#6b7280", order: 0 },
  { name: "Under Review", color: "#f59e0b", order: 1 },
  { name: "Planned", color: "#3b82f6", order: 2 },
  { name: "In Progress", color: "#8b5cf6", order: 3 },
  { name: "Completed", color: "#22c55e", order: 4 },
  { name: "Closed", color: "#ef4444", order: 5 },
];

/**
 * Step 1: Migrate board statuses to organization statuses
 */
export const migrateOrganizationStatuses = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    dryRun: v.optional(v.boolean()),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Migration script - complexity necessary for data transformation
  handler: async (ctx, args) => {
    const { dryRun = false } = args;
    const results: string[] = [];

    const organizations = args.organizationId
      ? await ctx.db.get(args.organizationId).then((org) => (org ? [org] : []))
      : await ctx.db.query("organizations").collect();

    for (const org of organizations) {
      const existingOrgStatuses = await ctx.db
        .query("organizationStatuses")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      if (existingOrgStatuses.length > 0) {
        results.push(
          `[SKIP] Org ${org.slug}: Already has ${existingOrgStatuses.length} organization statuses`
        );
        continue;
      }

      const boards = await ctx.db
        .query("boards")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      if (boards.length === 0) {
        // Create default statuses
        if (!dryRun) {
          const now = Date.now();
          for (const status of DEFAULT_STATUSES) {
            await ctx.db.insert("organizationStatuses", {
              organizationId: org._id,
              name: status.name,
              color: status.color,
              order: status.order,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        results.push(
          `[CREATE] Org ${org.slug}: Created ${DEFAULT_STATUSES.length} default statuses`
        );
        continue;
      }

      const firstBoard = boards[0];
      if (!firstBoard) {
        continue;
      }

      const boardStatuses = await ctx.db
        .query("boardStatuses")
        .withIndex("by_board", (q) => q.eq("boardId", firstBoard._id))
        .collect();

      if (boardStatuses.length === 0) {
        // Create default statuses
        if (!dryRun) {
          const now = Date.now();
          for (const status of DEFAULT_STATUSES) {
            await ctx.db.insert("organizationStatuses", {
              organizationId: org._id,
              name: status.name,
              color: status.color,
              order: status.order,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        results.push(
          `[CREATE] Org ${org.slug}: Created ${DEFAULT_STATUSES.length} default statuses (board had none)`
        );
        continue;
      }

      if (!dryRun) {
        const now = Date.now();
        for (const status of boardStatuses) {
          await ctx.db.insert("organizationStatuses", {
            organizationId: org._id,
            name: status.name,
            color: status.color,
            icon: status.icon,
            order: status.order,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      results.push(
        `[MIGRATE] Org ${org.slug}: Copied ${boardStatuses.length} statuses from board "${firstBoard.name}"`
      );
    }

    return {
      dryRun,
      organizationsProcessed: organizations.length,
      results,
    };
  },
});

/**
 * Step 2: Map feedback board statuses to organization statuses
 */
export const migrateFeedbackStatuses = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Migration script - complexity necessary for data transformation
  handler: async (ctx, args) => {
    const { dryRun = false } = args;
    const results: string[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    const organizations = args.organizationId
      ? await ctx.db.get(args.organizationId).then((org) => (org ? [org] : []))
      : await ctx.db.query("organizations").collect();

    for (const org of organizations) {
      const orgStatuses = await ctx.db
        .query("organizationStatuses")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      const statusMap = new Map<string, Id<"organizationStatuses">>();
      for (const status of orgStatuses) {
        statusMap.set(status.name.toLowerCase(), status._id);
      }

      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      for (const item of feedback) {
        if (item.organizationStatusId) {
          skippedCount++;
          continue;
        }

        let orgStatusId: Id<"organizationStatuses"> | undefined;

        if (item.statusId) {
          const boardStatus = await ctx.db.get(item.statusId);
          if (boardStatus) {
            orgStatusId = statusMap.get(boardStatus.name.toLowerCase());
          }
        }

        if (!orgStatusId) {
          const fallbackStatusName = item.status.replace(/_/g, " ");
          orgStatusId =
            statusMap.get(fallbackStatusName.toLowerCase()) ||
            statusMap.get("new") ||
            orgStatuses[0]?._id;
        }

        if (orgStatusId && !dryRun) {
          await ctx.db.patch(item._id, { organizationStatusId: orgStatusId });
          updatedCount++;
        }
      }

      results.push(
        `Org ${org.slug}: ${updatedCount} feedback updated, ${skippedCount} skipped`
      );
    }

    return {
      dryRun,
      updatedCount,
      skippedCount,
      results,
    };
  },
});

/**
 * Step 3: Migrate external users to use organizationId
 */
export const migrateExternalUsers = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { dryRun = false } = args;
    let updatedCount = 0;
    let skippedCount = 0;

    const externalUsers = await ctx.db.query("externalUsers").collect();

    for (const user of externalUsers) {
      if (!user.boardId) {
        skippedCount++;
        continue;
      }

      const board = await ctx.db.get(user.boardId);
      if (board && user.organizationId !== board.organizationId) {
        if (!dryRun) {
          await ctx.db.patch(user._id, {
            organizationId: board.organizationId,
          });
        }
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      dryRun,
      totalUsers: externalUsers.length,
      updatedCount,
      skippedCount,
    };
  },
});

/**
 * Step 4: Migrate board API keys to organization API keys
 */
export const migrateApiKeys = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { dryRun = false } = args;
    let createdCount = 0;
    let skippedCount = 0;
    const results: string[] = [];

    const boardApiKeys = await ctx.db.query("boardApiKeys").collect();

    for (const boardKey of boardApiKeys) {
      const board = await ctx.db.get(boardKey.boardId);
      if (!board) {
        results.push(`[SKIP] Key ${boardKey.publicKey}: Board not found`);
        skippedCount++;
        continue;
      }

      const existingOrgKey = await ctx.db
        .query("organizationApiKeys")
        .withIndex("by_public_key", (q) =>
          q.eq("publicKey", boardKey.publicKey)
        )
        .unique();

      if (existingOrgKey) {
        results.push(`[SKIP] Key ${boardKey.publicKey}: Already migrated`);
        skippedCount++;
        continue;
      }

      if (!dryRun) {
        await ctx.db.insert("organizationApiKeys", {
          organizationId: board.organizationId,
          name: `Migrated from board: ${board.name}`,
          publicKey: boardKey.publicKey,
          secretKeyHash: boardKey.secretKeyHash,
          allowedDomains: boardKey.allowedDomains,
          isActive: boardKey.isActive,
          rateLimit: boardKey.rateLimit,
          createdAt: boardKey.createdAt,
          lastUsedAt: boardKey.lastUsedAt,
        });
      }
      results.push(
        `[CREATE] Key ${boardKey.publicKey}: Migrated to org ${board.organizationId}`
      );
      createdCount++;
    }

    return {
      dryRun,
      totalBoardKeys: boardApiKeys.length,
      createdCount,
      skippedCount,
      results,
    };
  },
});

/**
 * Run full migration (all steps)
 * Note: Due to Convex constraints, run each step separately from the dashboard
 */
export const runFullMigration = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    dryRun: v.optional(v.boolean()),
  },
  handler: (_ctx, args) => {
    const { dryRun = false } = args;
    const results: Record<string, unknown> = {
      step1_statuses: "Run migrateOrganizationStatuses separately",
      step2_feedback: "Run migrateFeedbackStatuses separately",
      step3_users: "Run migrateExternalUsers separately",
      step4_keys: "Run migrateApiKeys separately",
    };

    return {
      dryRun,
      note: "Run each migration step separately from the Convex dashboard",
      results,
    };
  },
});

/**
 * Query to check migration status
 */
export const checkMigrationStatus = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const stats: Record<string, unknown> = {};

    const organizations = args.organizationId
      ? await ctx.db.get(args.organizationId).then((org) => (org ? [org] : []))
      : await ctx.db.query("organizations").collect();

    stats.totalOrganizations = organizations.length;

    let orgsWithOrgStatuses = 0;
    for (const org of organizations) {
      const statuses = await ctx.db
        .query("organizationStatuses")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .first();
      if (statuses) {
        orgsWithOrgStatuses++;
      }
    }
    stats.orgsWithOrganizationStatuses = orgsWithOrgStatuses;

    const allFeedback = await ctx.db.query("feedback").collect();
    const feedbackWithOrgStatus = allFeedback.filter(
      (f) => f.organizationStatusId
    ).length;
    stats.totalFeedback = allFeedback.length;
    stats.feedbackWithOrganizationStatus = feedbackWithOrgStatus;
    stats.feedbackNeedingMigration = allFeedback.length - feedbackWithOrgStatus;

    const externalUsers = await ctx.db.query("externalUsers").collect();
    const usersWithOrgId = externalUsers.filter((u) => u.organizationId).length;
    stats.totalExternalUsers = externalUsers.length;
    stats.externalUsersWithOrgId = usersWithOrgId;

    const boardKeys = await ctx.db.query("boardApiKeys").collect();
    const orgKeys = await ctx.db.query("organizationApiKeys").collect();
    stats.totalBoardApiKeys = boardKeys.length;
    stats.totalOrgApiKeys = orgKeys.length;

    return stats;
  },
});

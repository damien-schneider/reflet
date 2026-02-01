/**
 * Migration to remove deprecated boardId and statusId fields from feedback documents
 * Run this migration after deploying the schema changes.
 *
 * Usage:
 * 1. Deploy the schema with optional boardId/statusId fields
 * 2. Run this migration via the Convex dashboard or CLI
 * 3. Once complete, remove boardId/statusId from schema.ts
 * 4. Deploy again
 */

import { mutation, query } from "../_generated/server";

// Query to find feedback with deprecated fields
export const findFeedbackWithBoardFields = query({
  args: {},
  handler: async (ctx) => {
    const feedback = await ctx.db.query("feedback").collect();

    // Filter to feedback that has boardId or statusId
    const toMigrate = feedback.filter((f) => {
      const doc = f as Record<string, unknown>;
      return doc.boardId !== undefined || doc.statusId !== undefined;
    });

    return {
      total: feedback.length,
      toMigrate: toMigrate.length,
      sampleIds: toMigrate.slice(0, 10).map((f) => f._id),
    };
  },
});

// Mutation to clean up a batch of feedback documents
export const cleanupBoardFields = mutation({
  args: {},
  handler: async (ctx) => {
    const feedback = await ctx.db.query("feedback").collect();

    let cleaned = 0;
    for (const f of feedback) {
      const doc = f as Record<string, unknown>;
      if (doc.boardId !== undefined || doc.statusId !== undefined) {
        // Remove the deprecated fields by patching with undefined
        await ctx.db.patch(f._id, {
          boardId: undefined,
          statusId: undefined,
        } as Record<string, unknown>);
        cleaned++;
      }
    }

    return { cleaned };
  },
});

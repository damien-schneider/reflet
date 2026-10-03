import { internalMutation } from "../_generated/server";
import { SYSTEM_ACTOR_ID } from "../shared/actors";
import { changeFeedbackStatus } from "./status_change";

const MS_PER_DAY = 86_400_000;

/**
 * Archive/close stale feedback items across all orgs with the setting enabled.
 * Called by a daily cron job.
 */
export const archiveStaleFeedback = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all organizations (iterate through all)
    const orgs = await ctx.db.query("organizations").collect();

    let totalProcessed = 0;

    for (const org of orgs) {
      const settings = org.staleFeedbackSettings;
      if (!settings?.enabled) {
        continue;
      }

      const threshold = now - settings.daysInactive * MS_PER_DAY;
      const excludeStatuses = settings.excludeStatuses ?? [
        "planned",
        "in_progress",
      ];

      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      for (const item of feedbackItems) {
        // Skip if already closed/archived or deleted
        if (item.deletedAt) {
          continue;
        }

        if (item.status === "closed" || item.status === "completed") {
          continue;
        }

        // Skip excluded statuses
        if (excludeStatuses.includes(item.status)) {
          continue;
        }

        // Check last activity: use updatedAt as proxy for last activity
        if (item.updatedAt > threshold) {
          continue;
        }

        await changeFeedbackStatus(ctx, item, {
          actorId: SYSTEM_ACTOR_ID,
          source: "stale",
          status: "closed",
        });

        totalProcessed++;
      }
    }

    return { processed: totalProcessed };
  },
});

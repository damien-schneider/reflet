/**
 * Report mutations — archive and acknowledge reports.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

export const archiveReport = mutation({
  args: { reportId: v.id("autopilotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, report.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      archived: true,
      needsReview: false,
      reviewedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const acknowledgeReport = mutation({
  args: { reportId: v.id("autopilotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, report.organizationId, user._id);

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      needsReview: false,
      reviewedAt: now,
      acknowledgedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

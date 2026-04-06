/**
 * Report queries — list and get reports for the frontend.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listReports = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    return ctx.db
      .query("autopilotReports")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .filter((q) => q.eq(q.field("archived"), false))
      .take(limit);
  },
});

export const getReport = query({
  args: { reportId: v.id("autopilotReports") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    await requireOrgMembership(ctx, report.organizationId, user._id);
    return report;
  },
});

/**
 * Security dashboard queries — scan history, findings, dependency audits.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const requireOrgMembership = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return membership;
};

export const listSecurityFindings = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("fixing"),
        v.literal("fixed"),
        v.literal("dismissed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 100;

    if (args.status) {
      const status = args.status;
      return ctx.db
        .query("autopilotSecurityFindings")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotSecurityFindings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getSecurityStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const findings = await ctx.db
      .query("autopilotSecurityFindings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const openFindings = findings.filter((f) => f.status === "open");
    const fixedFindings = findings.filter((f) => f.status === "fixed");

    return {
      totalFindings: findings.length,
      openCount: openFindings.length,
      fixingCount: findings.filter((f) => f.status === "fixing").length,
      fixedCount: fixedFindings.length,
      dismissedCount: findings.filter((f) => f.status === "dismissed").length,
      bySeverity: {
        critical: openFindings.filter((f) => f.severity === "critical").length,
        high: openFindings.filter((f) => f.severity === "high").length,
        medium: openFindings.filter((f) => f.severity === "medium").length,
        low: openFindings.filter((f) => f.severity === "low").length,
        info: openFindings.filter((f) => f.severity === "info").length,
      },
      lastScanDate:
        findings.length > 0
          ? Math.max(...findings.map((f) => f.createdAt))
          : null,
    };
  },
});

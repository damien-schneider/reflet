import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { isOrgMemberViewer } from "../shared/access";

// ============================================
// QUERIES
// ============================================

/**
 * List all tags for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sort by laneOrder for roadmap lanes, then by name
    return tags.sort((a, b) => {
      if (a.isRoadmapLane && b.isRoadmapLane) {
        return (a.laneOrder ?? 0) - (b.laneOrder ?? 0);
      }
      if (a.isRoadmapLane) {
        return -1;
      }
      if (b.isRoadmapLane) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

export const getRoadmapConfig = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!(org && (org.isPublic || (await isOrgMemberViewer(ctx, org._id))))) {
      return { lanes: [] };
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isRoadmapLane"), true))
      .collect();

    const lanes = tags.sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));

    return { lanes };
  },
});

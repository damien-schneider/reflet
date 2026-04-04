/**
 * Initiative & user story queries — public, auth-gated.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listInitiatives = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotInitiatives")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const listStoriesByInitiative = query({
  args: { initiativeId: v.id("autopilotInitiatives") },
  handler: async (ctx, args) => {
    const initiative = await ctx.db.get(args.initiativeId);
    if (!initiative) {
      throw new Error("Initiative not found");
    }

    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, initiative.organizationId, user._id);

    return ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", args.initiativeId)
      )
      .collect();
  },
});

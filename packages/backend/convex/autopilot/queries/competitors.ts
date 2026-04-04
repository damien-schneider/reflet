/**
 * Competitor queries — public, auth-gated.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listCompetitors = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotCompetitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

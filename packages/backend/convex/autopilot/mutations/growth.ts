/**
 * Growth item mutations.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { growthItemStatus } from "../schema/validators";
import { requireOrgAdmin } from "./auth";

export const updateGrowthItem = mutation({
  args: {
    itemId: v.id("autopilotGrowthItems"),
    status: growthItemStatus,
    publishedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Growth item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === "published") {
      updates.publishedAt = Date.now();
    }

    if (args.publishedUrl !== undefined) {
      updates.publishedUrl = args.publishedUrl;
    }

    await ctx.db.patch(args.itemId, updates);
  },
});

/**
 * Inbox mutations — approve, reject, snooze, bulk update.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { inboxItemStatus } from "../schema/validators";
import { requireOrgAdmin } from "./auth";

export const updateInboxItem = mutation({
  args: {
    itemId: v.id("autopilotInboxItems"),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inbox item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (
      item.status === "pending" &&
      (args.status === "approved" ||
        args.status === "rejected" ||
        args.status === "snoozed")
    ) {
      updates.reviewedAt = now;
    }

    await ctx.db.patch(args.itemId, updates);

    let logLevel: "success" | "warning" | "action" = "action";
    if (args.status === "approved") {
      logLevel = "success";
    } else if (args.status === "rejected") {
      logLevel = "warning";
    }

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: logLevel,
      message: `Inbox item ${args.status}: ${item.title}`,
      organizationId: item.organizationId,
    });

    if (args.status === "approved" || args.status === "rejected") {
      await ctx.db.insert("autopilotFeedbackLog", {
        organizationId: item.organizationId,
        inboxItemId: args.itemId,
        agent: item.sourceAgent,
        itemType: item.type,
        decision: args.status,
        createdAt: now,
      });
    }
  },
});

export const bulkUpdateInbox = mutation({
  args: {
    itemIds: v.array(v.id("autopilotInboxItems")),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.itemIds.length === 0) {
      return;
    }

    const firstItem = await ctx.db.get(args.itemIds[0]);
    if (!firstItem) {
      throw new Error("Inbox item not found");
    }

    await requireOrgAdmin(ctx, firstItem.organizationId, user._id);

    const now = Date.now();

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) {
        continue;
      }

      const updates: Record<string, unknown> = {
        status: args.status,
      };

      if (item.status === "pending") {
        updates.reviewedAt = now;
      }

      await ctx.db.patch(itemId, updates);
    }

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: "action",
      message: `Bulk updated ${args.itemIds.length} inbox items to ${args.status}`,
      organizationId: firstItem.organizationId,
    });
  },
});

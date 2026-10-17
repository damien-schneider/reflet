import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const deleteIntelligenceNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const notifications = await ctx.db.query("notifications").collect();
    const intelligenceNotifications = notifications.filter(
      (notification) => notification.type === "intelligence_insight"
    );
    for (const notification of intelligenceNotifications) {
      await ctx.db.delete(notification._id);
    }
    return intelligenceNotifications.length;
  },
  returns: v.number(),
});

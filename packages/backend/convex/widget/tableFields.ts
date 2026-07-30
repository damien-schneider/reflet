import { defineTable } from "convex/server";
import { v } from "convex/values";
import { widgetPosition } from "../shared/validators";

export const widgetTables = {
  widgetConversations: defineTable({
    conversationId: v.id("supportConversations"),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    metadata: v.optional(
      v.object({
        referrer: v.optional(v.string()),
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    visitorId: v.string(),
    widgetId: v.id("widgets"),
  })
    .index("by_widget_visitor", ["widgetId", "visitorId"])
    .index("by_conversation", ["conversationId"]),

  widgetSettings: defineTable({
    autoOpen: v.boolean(),
    greetingMessage: v.optional(v.string()),
    position: widgetPosition,
    primaryColor: v.string(),
    showLauncher: v.boolean(),
    welcomeMessage: v.string(),
    widgetId: v.id("widgets"),
    zIndex: v.number(),
  }).index("by_widget", ["widgetId"]),
  widgets: defineTable({
    createdAt: v.number(),
    isActive: v.boolean(),
    name: v.string(),
    organizationId: v.id("organizations"),
    updatedAt: v.number(),
    widgetId: v.string(),
  })
    .index("by_widget_id", ["widgetId"])
    .index("by_organization", ["organizationId"]),
};

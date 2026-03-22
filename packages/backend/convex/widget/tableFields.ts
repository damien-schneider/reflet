import { defineTable } from "convex/server";
import { v } from "convex/values";
import { widgetPosition } from "../shared/validators";

export const widgetTables = {
  widgets: defineTable({
    organizationId: v.id("organizations"),
    widgetId: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_widget_id", ["widgetId"])
    .index("by_organization", ["organizationId"]),

  widgetSettings: defineTable({
    widgetId: v.id("widgets"),
    primaryColor: v.string(),
    position: widgetPosition,
    welcomeMessage: v.string(),
    greetingMessage: v.optional(v.string()),
    showLauncher: v.boolean(),
    autoOpen: v.boolean(),
    zIndex: v.number(),
  }).index("by_widget", ["widgetId"]),

  widgetConversations: defineTable({
    widgetId: v.id("widgets"),
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })
    ),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_widget_visitor", ["widgetId", "visitorId"])
    .index("by_conversation", ["conversationId"]),
};

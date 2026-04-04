import { defineTable } from "convex/server";
import { v } from "convex/values";
import { knowledgeDocType, knowledgeEditedBy } from "./validators";

export const knowledgeTables = {
  autopilotKnowledgeDocs: defineTable({
    organizationId: v.id("organizations"),
    docType: knowledgeDocType,
    ownerAgent: v.string(),
    title: v.string(),
    contentFull: v.string(),
    contentSummary: v.string(),
    version: v.number(),
    userEdited: v.boolean(),
    userEditedAt: v.optional(v.number()),
    userEditProtectedUntil: v.optional(v.number()),
    stalenessAlertDays: v.number(),
    lastUpdatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_docType", ["organizationId", "docType"]),

  autopilotKnowledgeDocVersions: defineTable({
    docId: v.id("autopilotKnowledgeDocs"),
    version: v.number(),
    content: v.string(),
    editedBy: knowledgeEditedBy,
    editingAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_doc", ["docId"]),
};

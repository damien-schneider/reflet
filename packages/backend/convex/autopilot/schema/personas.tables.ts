import { defineTable } from "convex/server";
import { v } from "convex/values";

export const personasTables = {
  autopilotPersonas: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    role: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    painPoints: v.array(v.string()),
    goals: v.array(v.string()),
    alternativesConsidered: v.array(v.string()),
    channels: v.array(v.string()),
    sourceDocIds: v.array(v.id("autopilotDocuments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_name", ["organizationId", "name"]),
};

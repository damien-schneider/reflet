import { defineTable } from "convex/server";
import { v } from "convex/values";
import { validatorScoreObject } from "./use_cases.tables";
import { communityPlatform } from "./validators";

export const communityPostsTables = {
  autopilotCommunityPosts: defineTable({
    organizationId: v.id("organizations"),
    platform: communityPlatform,
    authorName: v.string(),
    authorUrl: v.optional(v.string()),
    authorEmail: v.optional(v.string()),
    title: v.optional(v.string()),
    content: v.string(),
    sourceUrl: v.string(),
    parentThreadUrl: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    matchedPersonaIds: v.array(v.id("autopilotPersonas")),
    matchedUseCaseIds: v.array(v.id("autopilotUseCases")),
    validation: v.optional(validatorScoreObject),
    draftDocId: v.optional(v.id("autopilotDocuments")),
    discoveredAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_platform", ["organizationId", "platform"])
    .index("by_org_discovered", ["organizationId", "discoveredAt"]),
};

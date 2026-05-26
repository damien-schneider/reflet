/**
 * Product profile queries — typed alternative to the legacy markdown identity
 * knowledge doc.
 */

import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

const pricingModelValidator = v.union(
  v.literal("free"),
  v.literal("freemium"),
  v.literal("paid"),
  v.literal("open_source"),
  v.literal("enterprise"),
  v.literal("unknown")
);

const productProfileShape = v.object({
  _id: v.id("autopilotProductProfile"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  productName: v.string(),
  tagline: v.string(),
  oneLiner: v.string(),
  category: v.union(v.string(), v.null()),
  websiteUrl: v.union(v.string(), v.null()),
  valueProposition: v.string(),
  differentiators: v.array(v.string()),
  primaryUserVerbs: v.array(v.string()),
  targetAudienceTags: v.array(v.string()),
  pricingModel: v.union(pricingModelValidator, v.null()),
  ownerRole: v.string(),
  generatedBy: v.union(v.literal("role_skill"), v.literal("user")),
  version: v.number(),
  userEdited: v.boolean(),
  userEditedAt: v.union(v.number(), v.null()),
  lastUpdatedAt: v.number(),
  createdAt: v.number(),
});

export const getProductProfile = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(productProfileShape, v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const profile = await ctx.db
      .query("autopilotProductProfile")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!profile) {
      return null;
    }
    return {
      _id: profile._id,
      _creationTime: profile._creationTime,
      organizationId: profile.organizationId,
      productName: profile.productName,
      tagline: profile.tagline,
      oneLiner: profile.oneLiner,
      category: profile.category ?? null,
      websiteUrl: profile.websiteUrl ?? null,
      valueProposition: profile.valueProposition,
      differentiators: profile.differentiators,
      primaryUserVerbs: profile.primaryUserVerbs,
      targetAudienceTags: profile.targetAudienceTags,
      pricingModel: profile.pricingModel ?? null,
      ownerRole: profile.ownerRole,
      generatedBy: profile.generatedBy,
      version: profile.version,
      userEdited: profile.userEdited,
      userEditedAt: profile.userEditedAt ?? null,
      lastUpdatedAt: profile.lastUpdatedAt,
      createdAt: profile.createdAt,
    };
  },
});

export const getProductProfileInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotProductProfile")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
  },
});

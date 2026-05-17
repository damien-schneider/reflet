/**
 * Product profile mutations — user edits land here and trigger the protection
 * window so chain producers won't clobber them.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

const USER_EDIT_PROTECTION_MS = 7 * 24 * 60 * 60 * 1000;
const STALENESS_DAYS = 30;

const pricingModelValidator = v.union(
  v.literal("free"),
  v.literal("freemium"),
  v.literal("paid"),
  v.literal("open_source"),
  v.literal("enterprise"),
  v.literal("unknown")
);

export const updateProductProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    productName: v.string(),
    tagline: v.string(),
    oneLiner: v.string(),
    category: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    valueProposition: v.string(),
    differentiators: v.array(v.string()),
    primaryUserVerbs: v.array(v.string()),
    targetAudienceTags: v.array(v.string()),
    pricingModel: v.optional(pricingModelValidator),
  },
  returns: v.id("autopilotProductProfile"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const now = Date.now();
    const snapshot = {
      productName: args.productName,
      tagline: args.tagline,
      oneLiner: args.oneLiner,
      category: args.category,
      websiteUrl: args.websiteUrl,
      valueProposition: args.valueProposition,
      differentiators: args.differentiators,
      primaryUserVerbs: args.primaryUserVerbs,
      targetAudienceTags: args.targetAudienceTags,
      pricingModel: args.pricingModel,
    };

    const existing = await ctx.db
      .query("autopilotProductProfile")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      const newVersion = existing.version + 1;
      await ctx.db.patch(existing._id, {
        ...snapshot,
        generatedBy: "user",
        version: newVersion,
        userEdited: true,
        userEditedAt: now,
        userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
        lastUpdatedAt: now,
      });
      await ctx.db.insert("autopilotProductProfileVersions", {
        profileId: existing._id,
        version: newVersion,
        snapshot,
        editedBy: "user",
        createdAt: now,
      });
      return existing._id;
    }

    const profileId = await ctx.db.insert("autopilotProductProfile", {
      organizationId: args.organizationId,
      ...snapshot,
      ownerAgent: "cto",
      generatedBy: "user",
      version: 1,
      userEdited: true,
      userEditedAt: now,
      userEditProtectedUntil: now + USER_EDIT_PROTECTION_MS,
      stalenessAlertDays: STALENESS_DAYS,
      lastUpdatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("autopilotProductProfileVersions", {
      profileId,
      version: 1,
      snapshot,
      editedBy: "user",
      createdAt: now,
    });
    return profileId;
  },
});

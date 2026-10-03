import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { requireAuthUser } from "../shared/access";
import { randomSecretHex } from "../shared/hmac";
import { validateDomainFormat } from "./vercel";

const ROOT_DOMAIN = "reflet.app";

export const addDomain = mutation({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const domain = args.domain.toLowerCase().trim();

    if (!validateDomainFormat(domain)) {
      throw new Error(
        "Invalid domain format. Please enter a valid domain like feedback.example.com."
      );
    }

    if (domain.endsWith(`.${ROOT_DOMAIN}`) || domain === ROOT_DOMAIN) {
      throw new Error("Cannot use reflet.app subdomains as a custom domain.");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization.");
    }

    if (membership.role !== "admin" && membership.role !== "owner") {
      throw new Error("Only admins and owners can manage custom domains.");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found.");
    }

    const tier = await getOrgTier(ctx, args.organizationId);
    if (tier !== "pro") {
      throw new Error(
        "Custom domains are a Pro feature. Upgrade your plan to add a custom domain."
      );
    }

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_custom_domain", (q) => q.eq("customDomain", domain))
      .unique();

    if (existingOrg && existingOrg._id !== args.organizationId) {
      throw new Error("This domain is already in use by another organization.");
    }

    const previousDomain = org.customDomain;
    const isSameDomain = previousDomain === domain;

    await ctx.db.patch(args.organizationId, {
      customDomain: domain,
      customDomainChallengeToken:
        isSameDomain && org.customDomainChallengeToken
          ? org.customDomainChallengeToken
          : randomSecretHex(),
      customDomainError: undefined,
      customDomainStatus: "pending_verification",
      customDomainVerification: undefined,
    });

    if (previousDomain && !isSameDomain) {
      await ctx.scheduler.runAfter(
        0,
        internal.domains.actions.removeDomainAction,
        { domain: previousDomain, organizationId: args.organizationId }
      );
    }

    await ctx.scheduler.runAfter(0, internal.domains.actions.addDomainAction, {
      domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

export const removeDomain = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization.");
    }

    if (membership.role !== "admin" && membership.role !== "owner") {
      throw new Error("Only admins and owners can manage custom domains.");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found.");
    }

    if (!org.customDomain) {
      throw new Error("No custom domain configured for this organization.");
    }

    const domain = org.customDomain;

    await ctx.db.patch(args.organizationId, {
      customDomainError: undefined,
      customDomainStatus: "removing",
    });

    await ctx.scheduler.runAfter(
      0,
      internal.domains.actions.removeDomainAction,
      {
        domain,
        organizationId: args.organizationId,
      }
    );
  },
  returns: v.null(),
});

export const checkVerification = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization.");
    }

    if (membership.role !== "admin" && membership.role !== "owner") {
      throw new Error("Only admins and owners can manage custom domains.");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org?.customDomain) {
      throw new Error("No custom domain configured for this organization.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.domains.actions.verifyDomainAction,
      {
        domain: org.customDomain,
        organizationId: args.organizationId,
      }
    );
  },
  returns: v.null(),
});

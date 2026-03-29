import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { validateDomainFormat } from "./vercel";

const RESERVED_SUBDOMAINS = [
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "smtp",
  "ftp",
  "ns1",
  "ns2",
  "staging",
  "dev",
  "test",
] as const;

const ROOT_DOMAIN = "reflet.app";

export const addDomain = mutation({
  args: {
    organizationId: v.id("organizations"),
    domain: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const domain = args.domain.toLowerCase().trim();

    // Validate domain format
    if (!validateDomainFormat(domain)) {
      throw new Error(
        "Invalid domain format. Please enter a valid domain like feedback.example.com."
      );
    }

    // Reject *.reflet.app subdomains
    if (domain.endsWith(`.${ROOT_DOMAIN}`) || domain === ROOT_DOMAIN) {
      throw new Error("Cannot use reflet.app subdomains as a custom domain.");
    }

    // Reject reserved domains
    for (const reserved of RESERVED_SUBDOMAINS) {
      if (domain === `${reserved}.${ROOT_DOMAIN}`) {
        throw new Error("This domain is reserved and cannot be used.");
      }
    }

    // Auth: verify membership and admin/owner role
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

    // Check org exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found.");
    }

    // Billing gate: only Pro orgs can add custom domains
    if (org.subscriptionTier !== "pro") {
      throw new Error(
        "Custom domains are a Pro feature. Upgrade your plan to add a custom domain."
      );
    }

    // Uniqueness check: no other org should use this domain
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_custom_domain", (q) => q.eq("customDomain", domain))
      .unique();

    if (existingOrg && existingOrg._id !== args.organizationId) {
      throw new Error("This domain is already in use by another organization.");
    }

    // Set domain on org and schedule Vercel API action
    await ctx.db.patch(args.organizationId, {
      customDomain: domain,
      customDomainStatus: "pending_verification",
      customDomainError: undefined,
      customDomainVerification: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.domains.actions.addDomainAction, {
      organizationId: args.organizationId,
      domain,
    });
  },
});

export const removeDomain = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Auth: verify membership and admin/owner role
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

    // Mark as removing
    await ctx.db.patch(args.organizationId, {
      customDomainStatus: "removing",
      customDomainError: undefined,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.domains.actions.removeDomainAction,
      {
        organizationId: args.organizationId,
        domain,
      }
    );
  },
});

export const checkVerification = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Auth: verify membership and admin/owner role
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
        organizationId: args.organizationId,
        domain: org.customDomain,
      }
    );
  },
});

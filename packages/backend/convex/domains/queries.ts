import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

export const getByCustomDomain = query({
  args: { domain: v.string() },
  returns: v.any(), // Recursive type — Convex validators cannot express Doc<"organizations"> with optional nested objects
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_custom_domain", (q) =>
        q.eq("customDomain", args.domain.toLowerCase())
      )
      .unique();

    if (!org) {
      return null;
    }

    if (!org.isPublic) {
      return null;
    }

    if (org.customDomainStatus !== "active") {
      return null;
    }

    return org;
  },
});

export const getDomainStatus = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.null(),
    v.object({
      customDomain: v.optional(v.string()),
      customDomainStatus: v.optional(
        v.union(
          v.literal("pending_verification"),
          v.literal("active"),
          v.literal("invalid_configuration"),
          v.literal("removing"),
          v.literal("error")
        )
      ),
      customDomainVerification: v.optional(
        v.array(
          v.object({
            type: v.string(),
            domain: v.string(),
            value: v.string(),
            reason: v.optional(v.string()),
          })
        )
      ),
      customDomainError: v.optional(v.string()),
      customDomainLastCheckedAt: v.optional(v.number()),
      slug: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    return {
      customDomain: org.customDomain,
      customDomainStatus: org.customDomainStatus,
      customDomainVerification: org.customDomainVerification,
      customDomainError: org.customDomainError,
      customDomainLastCheckedAt: org.customDomainLastCheckedAt,
      slug: org.slug,
    };
  },
});

export const getPendingDomains = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.id("organizations"),
      domain: v.string(),
      lastCheckedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();

    const pending: Array<{
      organizationId: (typeof orgs)[0]["_id"];
      domain: string;
      lastCheckedAt: number | undefined;
    }> = [];

    for (const org of orgs) {
      if (
        !(org.customDomain && org.customDomainStatus) ||
        org.customDomainStatus === "active" ||
        org.customDomainStatus === "removing"
      ) {
        continue;
      }

      pending.push({
        organizationId: org._id,
        domain: org.customDomain,
        lastCheckedAt: org.customDomainLastCheckedAt,
      });
    }

    return pending;
  },
});

export const getActiveDomainOrgs = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.id("organizations"),
      domain: v.string(),
    })
  ),
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();

    const active: Array<{
      organizationId: (typeof orgs)[0]["_id"];
      domain: string;
    }> = [];

    for (const org of orgs) {
      if (org.customDomain && org.customDomainStatus === "active") {
        active.push({
          organizationId: org._id,
          domain: org.customDomain,
        });
      }
    }

    return active;
  },
});

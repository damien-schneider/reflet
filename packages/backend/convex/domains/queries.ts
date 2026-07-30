import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

export const getByCustomDomain = query({
  args: { domain: v.string() },
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
  returns: v.any(), // Recursive type — Convex validators cannot express Doc<"organizations"> with optional nested objects
});

export const getDomainStatus = query({
  args: { organizationId: v.id("organizations") },
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
      customDomainError: org.customDomainError,
      customDomainLastCheckedAt: org.customDomainLastCheckedAt,
      customDomainStatus: org.customDomainStatus,
      customDomainVerification: org.customDomainVerification,
      slug: org.slug,
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      customDomain: v.optional(v.string()),
      customDomainError: v.optional(v.string()),
      customDomainLastCheckedAt: v.optional(v.number()),
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
            domain: v.string(),
            reason: v.optional(v.string()),
            type: v.string(),
            value: v.string(),
          })
        )
      ),
      slug: v.string(),
    })
  ),
});

export const getPendingDomains = internalQuery({
  args: {},
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
        domain: org.customDomain,
        lastCheckedAt: org.customDomainLastCheckedAt,
        organizationId: org._id,
      });
    }

    return pending;
  },
  returns: v.array(
    v.object({
      domain: v.string(),
      lastCheckedAt: v.optional(v.number()),
      organizationId: v.id("organizations"),
    })
  ),
});

export const getActiveDomainOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();

    const active: Array<{
      organizationId: (typeof orgs)[0]["_id"];
      domain: string;
    }> = [];

    for (const org of orgs) {
      if (org.customDomain && org.customDomainStatus === "active") {
        active.push({
          domain: org.customDomain,
          organizationId: org._id,
        });
      }
    }

    return active;
  },
  returns: v.array(
    v.object({
      domain: v.string(),
      organizationId: v.id("organizations"),
    })
  ),
});

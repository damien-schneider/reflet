import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { randomSecretHex } from "../shared/hmac";
import { domainStatus } from "../shared/validators";

export const updateDomainStatus = internalMutation({
  args: {
    domain: v.string(),
    error: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: domainStatus,
    verification: v.optional(
      v.array(
        v.object({
          domain: v.string(),
          reason: v.optional(v.string()),
          type: v.string(),
          value: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (org?.customDomain !== args.domain) {
      return null;
    }
    await ctx.db.patch(args.organizationId, {
      customDomainError: args.error,
      customDomainLastCheckedAt: args.lastCheckedAt ?? Date.now(),
      customDomainStatus: args.status,
      customDomainVerification: args.verification,
    });
    return null;
  },
  returns: v.null(),
});

export const clearDomainFields = internalMutation({
  args: { domain: v.string(), organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (org?.customDomain !== args.domain) {
      return null;
    }
    await ctx.db.patch(args.organizationId, {
      customDomain: undefined,
      customDomainChallengeToken: undefined,
      customDomainError: undefined,
      customDomainLastCheckedAt: undefined,
      customDomainStatus: undefined,
      customDomainVerification: undefined,
    });
    return null;
  },
  returns: v.null(),
});

export const ensureDomainChallenge = internalMutation({
  args: { domain: v.string(), organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (org?.customDomain !== args.domain) {
      return null;
    }
    if (org.customDomainChallengeToken) {
      return { isLegacyActive: false, token: org.customDomainChallengeToken };
    }
    if (org.customDomainStatus === "active") {
      return { isLegacyActive: true, token: "" };
    }
    const token = randomSecretHex();
    await ctx.db.patch(args.organizationId, {
      customDomainChallengeToken: token,
    });
    return { isLegacyActive: false, token };
  },
  returns: v.union(
    v.null(),
    v.object({ isLegacyActive: v.boolean(), token: v.string() })
  ),
});

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { domainStatus } from "../shared/validators";

export const updateDomainStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    status: domainStatus,
    error: v.optional(v.string()),
    verification: v.optional(
      v.array(
        v.object({
          type: v.string(),
          domain: v.string(),
          value: v.string(),
          reason: v.optional(v.string()),
        })
      )
    ),
    lastCheckedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      customDomainStatus: args.status,
      customDomainError: args.error,
      customDomainVerification: args.verification,
      customDomainLastCheckedAt: args.lastCheckedAt ?? Date.now(),
    });
  },
});

export const clearDomainFields = internalMutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      customDomain: undefined,
      customDomainStatus: undefined,
      customDomainVerification: undefined,
      customDomainError: undefined,
      customDomainLastCheckedAt: undefined,
    });
  },
});

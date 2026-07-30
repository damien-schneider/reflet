import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { domainStatus } from "../shared/validators";

export const updateDomainStatus = internalMutation({
  args: {
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
    await ctx.db.patch(args.organizationId, {
      customDomainError: args.error,
      customDomainLastCheckedAt: args.lastCheckedAt ?? Date.now(),
      customDomainStatus: args.status,
      customDomainVerification: args.verification,
    });
  },
  returns: v.null(),
});

export const clearDomainFields = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      customDomain: undefined,
      customDomainError: undefined,
      customDomainLastCheckedAt: undefined,
      customDomainStatus: undefined,
      customDomainVerification: undefined,
    });
  },
  returns: v.null(),
});

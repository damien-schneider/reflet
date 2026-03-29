import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const verifyDomainAction = internalAction({
  args: {
    organizationId: v.id("organizations"),
    domain: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const verifyResult = await ctx.runAction(
      internal.domains.vercel.verifyDomain,
      { domain: args.domain }
    );

    if (verifyResult.error) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        organizationId: args.organizationId,
        status: "error",
        error: verifyResult.error,
        verification: verifyResult.verification,
      });
      return;
    }

    if (verifyResult.verified) {
      const configResult = await ctx.runAction(
        internal.domains.vercel.getDomainConfig,
        { domain: args.domain }
      );

      if (configResult.misconfigured) {
        await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
          organizationId: args.organizationId,
          status: "invalid_configuration",
          error:
            "DNS is not configured correctly. Please add a CNAME record pointing to cname.vercel-dns.com.",
          verification: verifyResult.verification,
        });
        return;
      }

      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        organizationId: args.organizationId,
        status: "active",
        verification: verifyResult.verification,
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
      organizationId: args.organizationId,
      status: "pending_verification",
      verification: verifyResult.verification,
    });
  },
});

export const checkSingleDomainStatus = internalAction({
  args: {
    organizationId: v.id("organizations"),
    domain: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      organizationId: args.organizationId,
      domain: args.domain,
    });
  },
});

export const addDomainAction = internalAction({
  args: {
    organizationId: v.id("organizations"),
    domain: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.addDomainToVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        organizationId: args.organizationId,
        status: "error",
        error: result.error ?? "Failed to add domain to Vercel",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
      organizationId: args.organizationId,
      status: "pending_verification",
      verification: result.verification,
    });

    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      organizationId: args.organizationId,
      domain: args.domain,
    });
  },
});

export const removeDomainAction = internalAction({
  args: {
    organizationId: v.id("organizations"),
    domain: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.removeDomainFromVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        organizationId: args.organizationId,
        status: "error",
        error: result.error ?? "Failed to remove domain from Vercel",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.clearDomainFields, {
      organizationId: args.organizationId,
    });
  },
});

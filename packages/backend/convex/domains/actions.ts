import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const verifyDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const verifyResult = await ctx.runAction(
      internal.domains.vercel.verifyDomain,
      { domain: args.domain }
    );

    if (verifyResult.error) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        error: verifyResult.error,
        organizationId: args.organizationId,
        status: "error",
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
          error:
            "DNS is not configured correctly. Please add a CNAME record pointing to cname.vercel-dns.com.",
          organizationId: args.organizationId,
          status: "invalid_configuration",
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
  returns: v.null(),
});

export const checkSingleDomainStatus = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      domain: args.domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

export const addDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.addDomainToVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        error: result.error ?? "Failed to add domain to Vercel",
        organizationId: args.organizationId,
        status: "error",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
      organizationId: args.organizationId,
      status: "pending_verification",
      verification: result.verification,
    });

    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      domain: args.domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

export const removeDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.removeDomainFromVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        error: result.error ?? "Failed to remove domain from Vercel",
        organizationId: args.organizationId,
        status: "error",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.clearDomainFields, {
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { getOrgTier } from "../../../billing/org_subscription";
import { PLAN_LIMITS } from "../../../billing/queries";

const MAX_DOMAINS_PER_CHECK = 10;
const UNVERIFIED_RECHECK_MS = 3 * 60 * 1000;
const VERIFIED_RECHECK_MS = 24 * 60 * 60 * 1000;

export const checkSendingDomains = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dueDomains = await ctx.runQuery(
      internal.support.email.domains.internal.listDomainsDueForCheck,
      {
        limit: MAX_DOMAINS_PER_CHECK,
        unverifiedBefore: now - UNVERIFIED_RECHECK_MS,
        verifiedBefore: now - VERIFIED_RECHECK_MS,
      }
    );

    for (const { organizationId, sendingDomainId } of dueDomains) {
      const tier = await getOrgTier(ctx, organizationId);
      if (PLAN_LIMITS[tier].supportEmailDomain) {
        await ctx.runAction(
          internal.support.email.domains.actions.pollResendDomain,
          { sendingDomainId }
        );
        continue;
      }
      const resendDomainId = await ctx.runMutation(
        internal.support.email.domains.internal.deleteSendingDomainRow,
        { sendingDomainId }
      );
      if (resendDomainId) {
        await ctx.runAction(
          internal.support.email.domains.actions.deleteResendDomain,
          { resendDomainId }
        );
      }
    }
    return null;
  },
  returns: v.null(),
});

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const MAX_DOMAINS_PER_CHECK = 10;
const RECENTLY_CHECKED_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export const checkPendingDomains = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const pendingDomains = await ctx.runQuery(
      internal.domains.queries.getPendingDomains,
      {}
    );

    const now = Date.now();
    const domainsToCheck = pendingDomains
      .filter(
        (d: { lastCheckedAt?: number }) =>
          !d.lastCheckedAt ||
          now - d.lastCheckedAt > RECENTLY_CHECKED_THRESHOLD_MS
      )
      .slice(0, MAX_DOMAINS_PER_CHECK);

    for (const domain of domainsToCheck) {
      await ctx.runAction(internal.domains.actions.checkSingleDomainStatus, {
        organizationId: domain.organizationId,
        domain: domain.domain,
      });
    }

    // Check active domains for subscription downgrades
    const activeDomainOrgs = await ctx.runQuery(
      internal.domains.queries.getActiveDomainOrgs,
      {}
    );

    for (const org of activeDomainOrgs) {
      const subscription = await ctx.runQuery(
        components.stripe.public.getSubscriptionByOrgId,
        { orgId: org.organizationId }
      );

      const hasProSubscription =
        subscription?.status === "active" ||
        subscription?.status === "trialing";

      if (!hasProSubscription) {
        await ctx.runAction(internal.domains.actions.removeDomainAction, {
          organizationId: org.organizationId,
          domain: org.domain,
        });
      }
    }
  },
});

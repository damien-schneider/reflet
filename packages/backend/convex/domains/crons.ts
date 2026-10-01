import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";

const MAX_DOMAINS_PER_CHECK = 10;
const RECENTLY_CHECKED_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export const checkPendingDomains = internalAction({
  args: {},
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
        domain: domain.domain,
        organizationId: domain.organizationId,
      });
    }

    const activeDomainOrgs = await ctx.runQuery(
      internal.domains.queries.getActiveDomainOrgs,
      {}
    );

    for (const org of activeDomainOrgs) {
      const tier = await getOrgTier(ctx, org.organizationId);
      if (tier !== "pro") {
        await ctx.runAction(internal.domains.actions.removeDomainAction, {
          domain: org.domain,
          organizationId: org.organizationId,
        });
      }
    }
  },
  returns: v.null(),
});

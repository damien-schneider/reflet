import { type Infer, v } from "convex/values";
import { z } from "zod";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import {
  getOrgSubscription,
  type OrgSubscription,
  pendingCancellationAt,
  planTierFor,
} from "../billing/org_subscription";
import { STRIPE_PRICES } from "../billing/stripe";
import { stripeTimestampToMs } from "../billing/stripe_timestamp";
import { assertSuperAdmin } from "../shared/access";
import { nonUserActorName } from "../shared/actors";
import { subscriptionTier } from "../shared/validators";

const billingInterval = v.union(
  v.literal("yearly"),
  v.literal("monthly"),
  v.literal("unknown")
);

const billingIntervalOf = (priceId: string): Infer<typeof billingInterval> => {
  if (priceId === STRIPE_PRICES.proYearly) {
    return "yearly";
  }
  if (priceId === STRIPE_PRICES.proMonthly) {
    return "monthly";
  }
  return "unknown";
};

export const ownerOf = async (ctx: QueryCtx, org: Doc<"organizations">) => {
  const owner = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
    .filter((q) => q.eq(q.field("role"), "owner"))
    .first();
  if (!owner) {
    return null;
  }
  const user = await authComponent.getAnyUserById(ctx, owner.userId);
  return user ? { email: user.email, name: user.name } : null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_FEEDBACK_WINDOW_MS = 30 * DAY_MS;
const NEWEST_SESSIONS_READ_PER_MEMBER = 10;
const NEWEST_ACTIVITY_LOGS_READ = 50;

const sessionPage = z.object({
  page: z.array(z.object({ updatedAt: z.number() })),
});

export const usageValidator = v.object({
  apiErrorsLast24h: v.number(),
  feedback: v.number(),
  feedbackLast30Days: v.number(),
  githubConnected: v.boolean(),
  lastActivityAt: v.optional(v.number()),
  lastApiRequestAt: v.optional(v.number()),
  lastFeedbackAt: v.optional(v.number()),
  lastTeamSeenAt: v.optional(v.number()),
  members: v.number(),
  monitors: v.number(),
  publishedReleases: v.number(),
  triageFailuresLast24h: v.number(),
});

const latestOf = (timestamps: (number | undefined)[]) =>
  timestamps.reduce<number | undefined>(
    (latest, timestamp) =>
      timestamp === undefined ? latest : Math.max(latest ?? 0, timestamp),
    undefined
  );

const lastSessionAtOf = async (ctx: QueryCtx, userId: string) => {
  const sessions = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "session",
    paginationOpts: { cursor: null, numItems: NEWEST_SESSIONS_READ_PER_MEMBER },
    sortBy: { direction: "desc", field: "createdAt" },
    where: [{ field: "userId", operator: "eq", value: userId }],
  });
  return latestOf(
    sessionPage.parse(sessions).page.map((session) => session.updatedAt)
  );
};

export const usageOf = async (
  ctx: QueryCtx,
  org: Doc<"organizations">
): Promise<Infer<typeof usageValidator>> => {
  const organizationId = org._id;
  const now = Date.now();
  const since = now - DAY_MS;
  const [
    members,
    feedback,
    releases,
    monitors,
    githubConnection,
    newestActivityLogs,
    apiKeys,
    apiErrors,
    triageFailures,
  ] = await Promise.all([
    ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
    ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
    ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
    ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
    ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .first(),
    ctx.db
      .query("activityLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(NEWEST_ACTIVITY_LOGS_READ),
    ctx.db
      .query("organizationApiKeys")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
    ctx.db
      .query("apiRequestLogs")
      .withIndex("by_organization_time", (q) =>
        q.eq("organizationId", organizationId).gt("timestamp", since)
      )
      .collect(),
    ctx.db
      .query("feedbackTriageRuns")
      .withIndex("by_org_status_completed", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("status", "failed")
          .gt("completedAt", since)
      )
      .collect(),
  ]);
  const activeFeedback = feedback.filter((item) => !item.deletedAt);
  const recentFeedbackSince = now - RECENT_FEEDBACK_WINDOW_MS;
  const memberSessionTimes = await Promise.all(
    members.map((member) => lastSessionAtOf(ctx, member.userId))
  );
  return {
    apiErrorsLast24h: apiErrors.length,
    feedback: activeFeedback.length,
    feedbackLast30Days: activeFeedback.filter(
      (item) => item.createdAt > recentFeedbackSince
    ).length,
    githubConnected: githubConnection !== null,
    lastActivityAt: newestActivityLogs.find(
      (log) => nonUserActorName(log.authorId) === undefined
    )?._creationTime,
    lastApiRequestAt: latestOf(apiKeys.map((key) => key.lastUsedAt)),
    lastFeedbackAt: latestOf(activeFeedback.map((item) => item.createdAt)),
    lastTeamSeenAt: latestOf(memberSessionTimes),
    members: members.length,
    monitors: monitors.length,
    publishedReleases: releases.filter((release) => release.publishedAt).length,
    triageFailuresLast24h: triageFailures.length,
  };
};

const lastPaidInvoiceOf = async (
  ctx: QueryCtx,
  org: Doc<"organizations">,
  subscription: OrgSubscription | null
) => {
  if (!subscription) {
    return null;
  }
  const invoices = await ctx.runQuery(
    components.stripe.public.listInvoicesByOrgId,
    { orgId: org._id }
  );
  const lastPaid = invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.stripeSubscriptionId === subscription.stripeSubscriptionId
    )
    .reduce<(typeof invoices)[number] | null>(
      (latest, invoice) =>
        latest && latest.created >= invoice.created ? latest : invoice,
      null
    );
  return (
    lastPaid && {
      amountPaidCents: lastPaid.amountPaid,
      paidAt: stripeTimestampToMs(lastPaid.created),
    }
  );
};

export const listCustomers = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx);

    const billedOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_stripe_customer", (q) => q.gt("stripeCustomerId", ""))
      .collect();

    return await Promise.all(
      billedOrgs.map(async (org) => {
        const [subscription, owner, usage] = await Promise.all([
          getOrgSubscription(ctx, org._id),
          ownerOf(ctx, org),
          usageOf(ctx, org),
        ]);
        const lastPaidInvoice = await lastPaidInvoiceOf(ctx, org, subscription);
        return {
          _id: org._id,
          createdAt: org.createdAt,
          customDomain: org.customDomain,
          isPublic: org.isPublic,
          name: org.name,
          owner,
          slug: org.slug,
          stripeCustomerId: org.stripeCustomerId,
          subscription: subscription && {
            billingInterval: billingIntervalOf(subscription.priceId),
            cancelsAt: pendingCancellationAt(subscription),
            currentPeriodEnd: stripeTimestampToMs(
              subscription.currentPeriodEnd
            ),
            lastPaidInvoice,
            status: subscription.status,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
          },
          tier: planTierFor(subscription),
          usage,
        };
      })
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("organizations"),
      createdAt: v.number(),
      customDomain: v.optional(v.string()),
      isPublic: v.boolean(),
      name: v.string(),
      owner: v.union(
        v.object({ email: v.string(), name: v.string() }),
        v.null()
      ),
      slug: v.string(),
      stripeCustomerId: v.optional(v.string()),
      subscription: v.union(
        v.object({
          billingInterval,
          cancelsAt: v.optional(v.number()),
          currentPeriodEnd: v.number(),
          lastPaidInvoice: v.union(
            v.object({ amountPaidCents: v.number(), paidAt: v.number() }),
            v.null()
          ),
          status: v.string(),
          stripeSubscriptionId: v.string(),
        }),
        v.null()
      ),
      tier: subscriptionTier,
      usage: usageValidator,
    })
  ),
});

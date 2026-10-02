import { type Infer, v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import {
  getOrgSubscription,
  type OrgSubscription,
  planTierFor,
} from "../billing/org_subscription";
import { STRIPE_PRICES } from "../billing/stripe";
import { stripeTimestampToMs } from "../billing/utils";
import { assertSuperAdmin } from "../shared/access";
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

const usageOf = async (ctx: QueryCtx, org: Doc<"organizations">) => {
  const organizationId = org._id;
  const [
    members,
    feedback,
    releases,
    monitors,
    githubConnection,
    lastActivity,
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
      .first(),
  ]);
  const activeFeedback = feedback.filter((item) => !item.deletedAt);
  const latestFeedback = activeFeedback.reduce<number | undefined>(
    (latest, item) => Math.max(latest ?? 0, item.createdAt),
    undefined
  );
  return {
    feedback: activeFeedback.length,
    githubConnected: githubConnection !== null,
    lastActivityAt: lastActivity?._creationTime,
    lastFeedbackAt: latestFeedback,
    members: members.length,
    monitors: monitors.length,
    publishedReleases: releases.filter((release) => release.publishedAt).length,
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
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
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
          cancelAtPeriodEnd: v.boolean(),
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
      usage: v.object({
        feedback: v.number(),
        githubConnected: v.boolean(),
        lastActivityAt: v.optional(v.number()),
        lastFeedbackAt: v.optional(v.number()),
        members: v.number(),
        monitors: v.number(),
        publishedReleases: v.number(),
      }),
    })
  ),
});

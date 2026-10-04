import { v } from "convex/values";
import type Stripe from "stripe";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type QueryCtx } from "../_generated/server";
import { stripeTimestampToMs } from "./stripe_timestamp";

export type CancellationSource = Pick<
  Stripe.Subscription,
  | "cancel_at"
  | "cancel_at_period_end"
  | "canceled_at"
  | "cancellation_details"
  | "ended_at"
  | "id"
  | "status"
  | "trial_end"
> & { items: { data: { current_period_end: number }[] } };

const cancellationState = v.union(
  v.literal("scheduled"),
  v.literal("ended"),
  v.literal("renewing")
);

const msOrUndefined = (seconds: number | null | undefined) =>
  seconds === null || seconds === undefined
    ? undefined
    : stripeTimestampToMs(seconds);

const endedDuringTrial = (subscription: CancellationSource) =>
  subscription.trial_end !== null &&
  subscription.ended_at !== null &&
  subscription.ended_at <= subscription.trial_end;

const stateOf = (subscription: CancellationSource) => {
  if (subscription.status === "canceled") {
    return "ended" as const;
  }
  const reason = subscription.cancellation_details?.reason ?? null;
  const scheduled =
    reason !== null ||
    subscription.cancel_at_period_end ||
    subscription.cancel_at !== null;
  return scheduled ? ("scheduled" as const) : ("renewing" as const);
};

/** Null for trials: they end by design, which is not churn. */
export const cancellationFromStripeSubscription = (
  subscription: CancellationSource
) => {
  if (subscription.status === "trialing" || endedDuringTrial(subscription)) {
    return null;
  }
  const details = subscription.cancellation_details;
  const scheduledEnd = subscription.cancel_at_period_end
    ? subscription.items.data[0]?.current_period_end
    : undefined;
  return {
    comment: details?.comment ?? undefined,
    endsAt: msOrUndefined(subscription.cancel_at ?? scheduledEnd),
    feedback: details?.feedback ?? undefined,
    reason: details?.reason ?? undefined,
    requestedAt: msOrUndefined(subscription.canceled_at),
    state: stateOf(subscription),
    stripeSubscriptionId: subscription.id,
  };
};

const isOpen = (cancellation: Doc<"subscriptionCancellations">) =>
  cancellation.endedAt === undefined && cancellation.resumedAt === undefined;

export const latestCancellationOf = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) =>
  await ctx.db
    .query("subscriptionCancellations")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .first();

export const recordSubscriptionCancellation = internalMutation({
  args: {
    comment: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    feedback: v.optional(v.string()),
    organizationId: v.string(),
    reason: v.optional(v.string()),
    requestedAt: v.optional(v.number()),
    state: cancellationState,
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, { requestedAt, state, ...args }) => {
    const organizationId = ctx.db.normalizeId(
      "organizations",
      args.organizationId
    );
    if (!organizationId) {
      return null;
    }
    const latest = await ctx.db
      .query("subscriptionCancellations")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .order("desc")
      .first();
    if (latest?.endedAt !== undefined) {
      return null;
    }
    const open = latest && isOpen(latest) ? latest : null;
    const now = Date.now();
    if (state === "renewing") {
      if (open) {
        await ctx.db.patch(open._id, { resumedAt: now });
      }
      return null;
    }
    const details = {
      comment: args.comment,
      endedAt: state === "ended" ? now : undefined,
      endsAt: args.endsAt,
      feedback: args.feedback,
      reason: args.reason,
    };
    if (open) {
      await ctx.db.patch(open._id, details);
      return null;
    }
    await ctx.db.insert("subscriptionCancellations", {
      ...details,
      organizationId,
      requestedAt: requestedAt ?? now,
      stripeSubscriptionId: args.stripeSubscriptionId,
    });
    return null;
  },
  returns: v.null(),
});

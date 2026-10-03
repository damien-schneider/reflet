import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth/auth";
import {
  isCallerVerifiedEmail,
  normalizeSubscriberEmail,
  sendSubscriptionConfirmation,
} from "../email/subscription_confirmation";
import { requireAuthUser } from "../shared/access";
import { rateLimiter } from "../shared/rate_limits";

function generateUnsubscribeToken(): string {
  return crypto.randomUUID();
}

/**
 * Get the subscriber count for an organization (admin only)
 */
export const getSubscriberCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return 0;
    }

    const subscribers = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return subscribers.filter(
      (subscriber) => subscriber.confirmationToken === undefined
    ).length;
  },
});

/**
 * Check if user is subscribed to changelog
 */
export const isSubscribed = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }

    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    return !!subscription;
  },
});

/**
 * Subscribe to changelog updates
 */
export const subscribe = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const subscriberId = await ctx.db.insert("changelogSubscribers", {
      organizationId: args.organizationId,
      subscribedAt: Date.now(),
      unsubscribeToken: generateUnsubscribeToken(),
      userId: user._id,
    });

    return subscriberId;
  },
});

/**
 * Unsubscribe from changelog updates
 */
export const unsubscribe = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);
    }

    return true;
  },
});

/**
 * Subscribe to changelog by email; anonymous addresses stay pending until confirmed
 */
export const subscribeByEmail = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const email = normalizeSubscriberEmail(args.email);
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    await rateLimiter.limit(ctx, "emailSubscriptionPerOrg", {
      key: args.organizationId,
      throws: true,
    });

    const existing = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_email_org", (q) =>
        q.eq("email", email).eq("organizationId", args.organizationId)
      )
      .first();
    const isVerifiedOwner = await isCallerVerifiedEmail(ctx, email);

    const isConfirmed =
      existing !== null && existing.confirmationToken === undefined;
    if (isConfirmed) {
      return null;
    }
    if (existing && isVerifiedOwner) {
      await ctx.db.patch(existing._id, { confirmationToken: undefined });
      return null;
    }

    const confirmationToken =
      existing?.confirmationToken ??
      (isVerifiedOwner ? undefined : crypto.randomUUID());
    if (!existing) {
      await ctx.db.insert("changelogSubscribers", {
        confirmationToken,
        email,
        organizationId: args.organizationId,
        subscribedAt: Date.now(),
        unsubscribeToken: generateUnsubscribeToken(),
      });
    }
    if (confirmationToken) {
      await sendSubscriptionConfirmation(ctx, {
        email,
        list: "changelog",
        organizationName: org.name,
        token: confirmationToken,
      });
    }
    return null;
  },
  returns: v.null(),
});

/**
 * Confirm a pending email subscription (double opt-in link)
 */
export const confirmByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_confirmation_token", (q) =>
        q.eq("confirmationToken", args.token)
      )
      .unique();

    if (!subscription) {
      throw new Error("Invalid or expired confirmation link");
    }

    await ctx.db.patch(subscription._id, { confirmationToken: undefined });
    return null;
  },
  returns: v.null(),
});

/**
 * Unsubscribe from changelog by token (for one-click unsubscribe links)
 */
export const unsubscribeByToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", args.token)
      )
      .unique();

    if (!subscription) {
      throw new Error("Invalid or expired unsubscribe token");
    }

    await ctx.db.delete(subscription._id);

    return true;
  },
});

/**
 * Get confirmed subscribers for an organization (internal use only)
 */
export const getSubscribersByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscribers = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return subscribers
      .filter((subscriber) => subscriber.confirmationToken === undefined)
      .map(({ _id, email, unsubscribeToken, userId }) => ({
        _id,
        email,
        unsubscribeToken,
        userId,
      }));
  },
  returns: v.array(
    v.object({
      _id: v.id("changelogSubscribers"),
      email: v.optional(v.string()),
      unsubscribeToken: v.string(),
      userId: v.optional(v.string()),
    })
  ),
});

/**
 * Migrate existing subscribers to add unsubscribe tokens (internal use only)
 */
export const migrateSubscriberTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db.query("changelogSubscribers").collect();
    let migrated = 0;

    for (const subscriber of subscribers) {
      if (!subscriber.unsubscribeToken) {
        await ctx.db.patch(subscriber._id, {
          unsubscribeToken: generateUnsubscribeToken(),
        });
        migrated++;
      }
    }

    return { migrated, total: subscribers.length };
  },
});

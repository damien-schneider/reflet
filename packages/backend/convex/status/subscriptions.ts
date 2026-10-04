import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  isCallerVerifiedEmail,
  normalizeSubscriberEmail,
  sendSubscriptionConfirmation,
} from "../email/subscription_confirmation";
import { rateLimiter } from "../shared/rate_limits";

export const subscribe = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const email = normalizeSubscriberEmail(args.email);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization?.isPublic) {
      throw new Error("Organization not found");
    }
    await rateLimiter.limit(ctx, "emailSubscriptionPerOrg", {
      key: args.organizationId,
      throws: true,
    });

    const existing = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_email_org", (q) =>
        q.eq("email", email).eq("organizationId", args.organizationId)
      )
      .unique();
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
      await ctx.db.insert("statusSubscribers", {
        confirmationToken,
        email,
        organizationId: args.organizationId,
        subscribedAt: Date.now(),
        unsubscribeToken: crypto.randomUUID(),
      });
    }
    if (confirmationToken) {
      await sendSubscriptionConfirmation(ctx, {
        email,
        list: "status",
        organizationName: organization.name,
        token: confirmationToken,
      });
    }
    return null;
  },
  returns: v.null(),
});

export const confirm = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_confirmation_token", (q) =>
        q.eq("confirmationToken", args.token)
      )
      .unique();

    if (!subscriber) {
      throw new Error("Invalid or expired confirmation link");
    }

    await ctx.db.patch(subscriber._id, { confirmationToken: undefined });
    return null;
  },
  returns: v.null(),
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", args.token)
      )
      .unique();

    if (!subscriber) {
      return { success: false };
    }

    await ctx.db.delete(subscriber._id);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { hmacSha256Hex } from "../shared/hmac";

const DELIVERY_TIMEOUT_MS = 10_000;

export const deliver = internalAction({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(
      internal.webhooks.queries.getDeliveryTarget,
      { deliveryId: args.deliveryId }
    );
    if (target?.delivery.status !== "pending") {
      return;
    }
    const { delivery, webhook } = target;

    const feedback = await ctx.runQuery(
      internal.feedback.api_public_list.getFeedbackByOrganization,
      {
        feedbackId: delivery.feedbackId,
        includePrivateContext: true,
        organizationId: delivery.organizationId,
      }
    );
    const isDeliverable =
      feedback && webhook.isActive && feedback.isInternal !== true;
    if (!isDeliverable) {
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        outcome: "skipped",
      });
      return;
    }

    const body = JSON.stringify({
      createdAt: delivery.createdAt,
      data: { feedback },
      event: delivery.event,
      id: delivery._id,
      organizationId: delivery.organizationId,
    });
    const signature = await hmacSha256Hex(webhook.secret, body);

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const response = await fetch(webhook.url, {
        body,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Reflet-Webhooks/1.0",
          "X-Reflet-Delivery": delivery._id,
          "X-Reflet-Event": delivery.event,
          "X-Reflet-Signature": `sha256=${signature}`,
        },
        method: "POST",
        signal: abort.signal,
      });
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        outcome: response.ok ? "success" : "failed",
        responseStatus: response.status,
      });
    } catch (error) {
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        error: error instanceof Error ? error.message : "Request failed",
        outcome: "failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  },
});

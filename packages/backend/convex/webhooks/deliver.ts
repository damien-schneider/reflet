import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import { hmacSha256Hex } from "../shared/hmac";
import {
  describeFetchFailure,
  fetchPublicUrl,
} from "../shared/outbound/public_fetch";

const DELIVERY_TIMEOUT_MS = 10_000;

const loadPayloadData = async (
  ctx: ActionCtx,
  delivery: Doc<"webhookDeliveries">
): Promise<Record<string, unknown> | null> => {
  if (delivery.surveyResponseId) {
    return await ctx.runQuery(
      internal.webhooks.queries.getSurveyResponsePayload,
      {
        organizationId: delivery.organizationId,
        surveyResponseId: delivery.surveyResponseId,
      }
    );
  }
  if (!delivery.feedbackId) {
    return null;
  }
  const feedback = await ctx.runQuery(
    internal.feedback.api_public_list.getFeedbackByOrganization,
    {
      feedbackId: delivery.feedbackId,
      includePrivateContext: true,
      organizationId: delivery.organizationId,
    }
  );
  return feedback?.publication === "approved" ? { feedback } : null;
};

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

    const data = await loadPayloadData(ctx, delivery);
    if (!(data && webhook.isActive)) {
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        outcome: "skipped",
      });
      return;
    }

    const body = JSON.stringify({
      createdAt: delivery.createdAt,
      data,
      event: delivery.event,
      id: delivery._id,
      organizationId: delivery.organizationId,
    });
    const signature = await hmacSha256Hex(webhook.secret, body);

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const { response } = await fetchPublicUrl(
        webhook.url,
        {
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
        },
        { followRedirects: false }
      );
      await response.body?.cancel();
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        outcome: response.ok ? "success" : "failed",
        responseStatus: response.status,
      });
    } catch (error) {
      await ctx.runMutation(internal.webhooks.mutations.recordResult, {
        deliveryId: delivery._id,
        error: describeFetchFailure(error),
        outcome: "failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  },
});

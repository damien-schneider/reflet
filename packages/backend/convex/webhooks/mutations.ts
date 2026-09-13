import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { randomSecretHex } from "../shared/hmac";
import { type WebhookEvent, webhookEvent } from "./tableFields";

const RETRY_DELAYS_MS = [60_000, 600_000];
const CONSECUTIVE_FAILURES_BEFORE_DISABLE = 20;

export async function emitWebhookEvent(
  ctx: MutationCtx,
  args: {
    event: WebhookEvent;
    feedbackId: Id<"feedback">;
    organizationId: Id<"organizations">;
  }
): Promise<void> {
  const webhooks = await ctx.db
    .query("organizationWebhooks")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();
  const now = Date.now();

  for (const webhook of webhooks) {
    if (!(webhook.isActive && webhook.events.includes(args.event))) {
      continue;
    }
    const deliveryId = await ctx.db.insert("webhookDeliveries", {
      attempts: 0,
      createdAt: now,
      event: args.event,
      feedbackId: args.feedbackId,
      organizationId: args.organizationId,
      status: "pending",
      webhookId: webhook._id,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver.deliver, {
      deliveryId,
    });
  }
}

function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Webhook URL must be a valid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URL must use http or https");
  }
}

export const create = mutation({
  args: {
    description: v.optional(v.string()),
    events: v.array(webhookEvent),
    organizationId: v.id("organizations"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "manage webhooks");
    assertHttpUrl(args.url);
    if (args.events.length === 0) {
      throw new Error("Select at least one event");
    }

    const secret = randomSecretHex();
    const now = Date.now();
    const webhookId = await ctx.db.insert("organizationWebhooks", {
      consecutiveFailures: 0,
      createdAt: now,
      description: args.description,
      events: args.events,
      isActive: true,
      organizationId: args.organizationId,
      secret,
      updatedAt: now,
      url: args.url,
    });

    return { secret, webhookId };
  },
});

export const update = mutation({
  args: {
    description: v.optional(v.string()),
    events: v.optional(v.array(webhookEvent)),
    isActive: v.optional(v.boolean()),
    url: v.optional(v.string()),
    webhookId: v.id("organizationWebhooks"),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }
    await requireOrgAdmin(ctx, webhook.organizationId, "manage webhooks");
    if (args.url !== undefined) {
      assertHttpUrl(args.url);
    }
    if (args.events !== undefined && args.events.length === 0) {
      throw new Error("Select at least one event");
    }

    const { webhookId, ...updates } = args;
    await ctx.db.patch(webhookId, {
      ...updates,
      consecutiveFailures:
        args.isActive === true ? 0 : webhook.consecutiveFailures,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { webhookId: v.id("organizationWebhooks") },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      return;
    }
    await requireOrgAdmin(ctx, webhook.organizationId, "manage webhooks");

    const deliveries = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_webhook", (q) => q.eq("webhookId", args.webhookId))
      .collect();
    for (const delivery of deliveries) {
      await ctx.db.delete(delivery._id);
    }
    await ctx.db.delete(args.webhookId);
  },
});

export const recordResult = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    error: v.optional(v.string()),
    outcome: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    responseStatus: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      return;
    }
    const webhook = await ctx.db.get(delivery.webhookId);
    const now = Date.now();

    if (args.outcome === "skipped") {
      await ctx.db.patch(delivery._id, { status: "skipped" });
      return;
    }

    const attempts = delivery.attempts + 1;

    if (args.outcome === "success") {
      await ctx.db.patch(delivery._id, {
        attempts,
        lastError: undefined,
        nextAttemptAt: undefined,
        responseStatus: args.responseStatus,
        status: "success",
      });
      if (webhook) {
        await ctx.db.patch(webhook._id, {
          consecutiveFailures: 0,
          updatedAt: now,
        });
      }
      return;
    }

    const retryDelayMs = RETRY_DELAYS_MS[attempts - 1];
    const willRetry = retryDelayMs !== undefined;
    await ctx.db.patch(delivery._id, {
      attempts,
      lastError: args.error,
      nextAttemptAt: willRetry ? now + retryDelayMs : undefined,
      responseStatus: args.responseStatus,
      status: willRetry ? "pending" : "failed",
    });
    if (willRetry) {
      await ctx.scheduler.runAfter(
        retryDelayMs,
        internal.webhooks.deliver.deliver,
        { deliveryId: delivery._id }
      );
    }

    if (!webhook) {
      return;
    }
    const consecutiveFailures = webhook.consecutiveFailures + 1;
    const exhausted =
      consecutiveFailures >= CONSECUTIVE_FAILURES_BEFORE_DISABLE;
    await ctx.db.patch(webhook._id, {
      consecutiveFailures,
      isActive: exhausted ? false : webhook.isActive,
      updatedAt: now,
    });
  },
});
